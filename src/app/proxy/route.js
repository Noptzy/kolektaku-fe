import { NextResponse } from "next/server";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

let cachedFreeProxies = [];
let lastFetch = 0;

const FETCH_HEADERS = {
  Referer: "https://rapid-cloud.co/",
  Origin: "https://rapid-cloud.co",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Encoding": "identity", // Disable compression so streaming works cleanly
  "Sec-Ch-Ua": '"Chromium";v="144", "Not-A.Brand";v="24", "Google Chrome";v="144"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

async function getFreeProxies() {
  const now = Date.now();
  if (cachedFreeProxies.length > 100 && now - lastFetch < 10 * 60 * 1000)
    return cachedFreeProxies;

  try {
    const sources = [
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
      "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
      "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
      "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
    ];

    const results = await Promise.allSettled(
      sources.map((s) => axios.get(s, { timeout: 8000 })),
    );

    let all = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && typeof r.value.data === "string") {
        const lines = r.value.data
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l));
        all.push(...lines.map((l) => `http://${l}`));
      }
    });

    cachedFreeProxies = [...new Set(all)];
    lastFetch = now;
    console.log(`[Proxy] Loaded ${cachedFreeProxies.length} free proxies`);
  } catch (e) {
    // keep stale cache
  }
  return cachedFreeProxies;
}

// For m3u8: arraybuffer (needs full content for URL rewriting)
async function fetchBuffer(url, proxy, timeout = 10000) {
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout,
    httpsAgent: agent,
    proxy: false,
    headers: FETCH_HEADERS,
  });
  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/html") && res.data.length < 10000) {
    throw new Error("Cloudflare Blocked");
  }
  return res;
}

// For .ts segments: stream directly — no buffering, bytes flow immediately
async function fetchStream(url, proxy, timeout = 10000) {
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
  const res = await axios.get(url, {
    responseType: "stream",
    timeout,
    httpsAgent: agent,
    proxy: false,
    headers: FETCH_HEADERS,
  });
  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/html")) {
    res.data.destroy();
    throw new Error("Cloudflare Blocked");
  }
  return res;
}

function getStickyProxies(url, allProxies, count = 40) {
  if (allProxies.length === 0) return [];
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    pathParts.pop();
    const stickyKey = urlObj.hostname + pathParts.join("/");

    let hash = 0;
    for (let i = 0; i < stickyKey.length; i++) {
      hash = (hash << 5) - hash + stickyKey.charCodeAt(i);
      hash |= 0;
    }

    const startIndex = Math.abs(hash) % allProxies.length;
    const selected = [];
    for (let i = 0; i < count; i++) {
      selected.push(allProxies[(startIndex + i) % allProxies.length]);
    }
    return selected;
  } catch {
    return allProxies.slice(0, count);
  }
}

function nodeStreamToWeb(nodeStream) {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) =>
        controller.enqueue(new Uint8Array(chunk)),
      );
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (e) => controller.error(e));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new NextResponse("URL is required", { status: 400 });

  const isSegment = url.includes(".ts");
  const isM3u8 = url.includes(".m3u8");

  const responseHeaders = new Headers();
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  if (isSegment || isM3u8) {
    responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  }

  // ── SEGMENT (.ts): stream langsung, zero buffering ──────────────────────
  if (isSegment) {
    try {
      const res = await fetchStream(url, null, 15000);

      const contentType = res.headers["content-type"];
      if (contentType) responseHeaders.set("Content-Type", contentType);
      if (res.headers["content-length"])
        responseHeaders.set("Content-Length", res.headers["content-length"]);

      return new NextResponse(nodeStreamToWeb(res.data), {
        status: 200,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[Proxy] Segment failed: ${url.substring(0, 60)}`, error.message);
      return new NextResponse("Segment unavailable", {
        status: 503,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  // ── M3U8 / other: arraybuffer + URL rewriting ────────────────────────────
  try {
    const winner = await fetchBuffer(url, null, 15000);

    let data = winner.data;
    const contentType = winner.headers["content-type"];
    if (contentType) responseHeaders.set("Content-Type", contentType);

    if (isM3u8) {
      let content = Buffer.from(data).toString();
      const baseUrl =
        new URL(url).origin +
        new URL(url).pathname.split("/").slice(0, -1).join("/") +
        "/";

      // Resolve relative URLs to absolute
      const lines = content.split("\n").map((line) => {
        if (line.trim() && !line.startsWith("#")) {
          const segmentUrl = line.trim();
          if (!segmentUrl.startsWith("http")) {
            return new URL(segmentUrl, baseUrl).toString();
          }
          return segmentUrl;
        }
        return line;
      });
      data = Buffer.from(lines.join("\n"));
      responseHeaders.set("Content-Length", data.length.toString());
    }

    return new NextResponse(data, { status: 200, headers: responseHeaders });
  } catch (error) {
    console.error(`[Proxy Error] Failed: ${url.substring(0, 60)}`, error.message);
    return new NextResponse("Proxy failed. Try again.", {
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
