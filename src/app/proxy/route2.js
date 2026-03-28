import { NextResponse } from "next/server";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

// Premium Proxies from Webshare
const PREMIUM_PROXIES = [
  "http://lfaoksft:f9bphzfr05k9@31.59.20.176:6754",
  "http://lfaoksft:f9bphzfr05k9@23.95.150.145:6114",
  "http://lfaoksft:f9bphzfr05k9@198.23.239.134:6540",
  "http://lfaoksft:f9bphzfr05k9@45.38.107.97:6014",
  "http://lfaoksft:f9bphzfr05k9@107.172.163.27:6543",
  "http://lfaoksft:f9bphzfr05k9@198.105.121.200:6462",
  "http://lfaoksft:f9bphzfr05k9@64.137.96.74:6641",
  "http://lfaoksft:f9bphzfr05k9@216.10.27.159:6837",
  "http://lfaoksft:f9bphzfr05k9@142.111.67.146:5611",
  "http://lfaoksft:f9bphzfr05k9@191.96.254.138:6185",
];

let cachedFreeProxies = [];
let lastFetch = 0;

async function getFreeProxies() {
  const now = Date.now();
  if (cachedFreeProxies.length > 50 && now - lastFetch < 15 * 60 * 1000)
    return cachedFreeProxies;

  try {
    const sources = [
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    ];

    const results = await Promise.allSettled(
      sources.map((s) => axios.get(s, { timeout: 5000 })),
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
    return cachedFreeProxies;
  } catch (e) {
    return cachedFreeProxies;
  }
}

function getStickyProxy(url, proxies) {
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

    const index = Math.abs(hash) % proxies.length;
    return proxies[index];
  } catch (e) {
    return proxies[0];
  }
}

async function tryFetch(url, proxy, timeout = 12000) {
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: timeout,
    httpsAgent: agent,
    proxy: false,
    headers: {
      Referer: "https://rapid-cloud.co/",
      Origin: "https://rapid-cloud.co",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Ch-Ua":
        '"Chromium";v="144", "Not-A.Brand";v="24", "Google Chrome";v="144"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    },
  });

  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/html") && res.data.length < 10000) {
    throw new Error("Cloudflare Blocked");
  }

  return res;
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

  // Ambil proxy premium yang sticky buat URL ini
  const premiumProxy = getStickyProxy(url, PREMIUM_PROXIES);

  try {
    // Prioritas 1: Pake Premium Proxy (Sticky)
    let winner;
    try {
      winner = await tryFetch(url, premiumProxy, 10000);
    } catch (premiumError) {
      console.warn(
        `[Proxy] Premium failed for ${url}, falling back to free race...`,
      );
      // Fallback: Pake Free Proxies (Mega Race)
      const freeProxies = await getFreeProxies();
      const candidates = freeProxies
        .sort(() => Math.random() - 0.5)
        .slice(0, 15);
      winner = await Promise.any(
        candidates.map((p) => tryFetch(url, p, 12000)),
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    let data = winner.data;
    const contentType = winner.headers["content-type"];
    if (contentType) responseHeaders.set("Content-Type", contentType);

    // M3U8 Rewriting: Biar segmen video selanjutnya tetep lewat proxy kita
    if (
      url.includes(".m3u8") &&
      (contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("text/plain"))
    ) {
      let content = Buffer.from(data).toString();
      const baseUrl =
        new URL(url).origin +
        new URL(url).pathname.split("/").slice(0, -1).join("/") +
        "/";

      const lines = content.split("\n").map((line) => {
        if (line.trim() && !line.startsWith("#")) {
          let segmentUrl = line.trim();
          if (!segmentUrl.startsWith("http")) {
            segmentUrl = new URL(segmentUrl, baseUrl).toString();
          }
          return `${origin}/proxy?url=${encodeURIComponent(segmentUrl)}`;
        }
        return line;
      });
      data = Buffer.from(lines.join("\n"));
      responseHeaders.set("Content-Length", data.length.toString());
    }

    if (url.includes(".ts") || url.includes(".m3u8") || url.includes(".js")) {
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=3600",
      );
    }

    return new NextResponse(data, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return new NextResponse("All proxies blocked. Please try again.", {
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
