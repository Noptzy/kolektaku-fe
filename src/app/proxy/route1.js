import { NextResponse } from "next/server";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

let cachedFreeProxies = [];
let workingProxies = new Set();
let lastFetch = 0;
// Tambahkan cache eksternal via Upstash/Redis jika di Vercel, tapi untuk sekarang kita pake memori dulu
// Namun, karena Vercel Serverless itu "stateless", variabel global di atas akan di-reset setiap function cold start.
// Solusi: Gunakan SWR (Stale-While-Revalidate) pattern untuk list proxy.

async function getFreeProxies() {
  const now = Date.now();

  // Jika sudah ada cache dan belum expired (15 menit), langsung return
  if (cachedFreeProxies.length > 50 && now - lastFetch < 15 * 60 * 1000) {
    return cachedFreeProxies;
  }

  // Jika sedang fetch, jangan double fetch (lock sederhana)
  if (global._isFetchingProxies) return cachedFreeProxies;
  global._isFetchingProxies = true;

  try {
    const sources = [
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
      "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
      "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
      "https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt",
      "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
      "https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt",
    ];

    console.log("[Proxy] Fetching fresh proxies...");
    // Gunakan timeout lebih agresif per source agar tidak nunggu lama
    const results = await Promise.allSettled(
      sources.map((s) => axios.get(s, { timeout: 4000 })),
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

    if (all.length > 0) {
      // Shuffle proxy agar tidak kena rate limit di awal terus
      cachedFreeProxies = [...new Set(all)].sort(() => Math.random() - 0.5);
      lastFetch = now;
      console.log(`[Proxy] Loaded ${cachedFreeProxies.length} free proxies`);
    }
  } catch (e) {
    console.error("[Proxy] Fetch error:", e.message);
  } finally {
    global._isFetchingProxies = false;
  }
  return cachedFreeProxies;
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
  // Validasi: Kalau dapet HTML tapi aslinya video/segmen, berarti di-block Cloudflare
  if (
    contentType.includes("text/html") &&
    (url.includes(".ts") || url.includes(".m3u8"))
  ) {
    throw new Error("Cloudflare Blocked (HTML instead of Stream)");
  }

  // Jika berhasil, simpan ke list "Working"
  if (proxy) {
    workingProxies.add(proxy);
    // Batasi working proxies agar tidak terlalu banyak dan outdated
    if (workingProxies.size > 20) {
      const first = workingProxies.values().next().value;
      workingProxies.delete(first);
    }
  }

  return { data: res.data, headers: res.headers, proxy };
}

function getStickyProxies(url, allProxies, count = 50) {
  if (allProxies.length === 0) return [];

  // Prioritaskan workingProxies di urutan paling atas
  const workingArr = Array.from(workingProxies).reverse(); // Yang terbaru lebih dulu
  const uniquePool = [...new Set([...workingArr, ...allProxies])];

  try {
    const urlObj = new URL(url);
    // Hashing folder path untuk "Sticky" session
    const pathParts = urlObj.pathname.split("/");
    pathParts.pop();
    const stickyKey = urlObj.hostname + pathParts.join("/");

    let hash = 0;
    for (let i = 0; i < stickyKey.length; i++) {
      hash = (hash << 5) - hash + stickyKey.charCodeAt(i);
      hash |= 0;
    }

    const startIndex = Math.abs(hash) % uniquePool.length;
    const selected = [];
    for (let i = 0; i < count; i++) {
      selected.push(uniquePool[(startIndex + i) % uniquePool.length]);
    }
    return selected;
  } catch (e) {
    return uniquePool.slice(0, count);
  }
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

  try {
    const freeProxies = await getFreeProxies();

    // Jika masih kosong (fetching), tunggu sebentar atau coba direct (opsional)
    if (freeProxies.length === 0) {
      // Coba direct fetch dulu kalau proxy belum siap
      const direct = await tryFetch(url, null, 5000);
      return new NextResponse(direct.data, {
        headers: { "Content-Type": direct.headers["content-type"] },
      });
    }

    const candidates = getStickyProxies(url, freeProxies, 50);

    // ─── STRATEGI MEGA RACE + WORKING CACHE ───────────────────
    // 1. Coba working proxies + 5 proxy pertama (total 10) dengan timeout 4s (Fast)
    // 2. Jika gagal, hajar 40 sisanya dengan timeout 10s (Massive)

    let winner;
    const fastBatch = candidates.slice(0, 10);
    const restBatch = candidates.slice(10);

    try {
      console.log(
        `[Proxy] Race 1 (Fast Batch): ${url.substring(url.lastIndexOf("/") + 1)}`,
      );
      winner = await Promise.any(fastBatch.map((p) => tryFetch(url, p, 4000)));
    } catch (e) {
      console.log(
        `[Proxy] Race 2 (Rest Batch): ${url.substring(url.lastIndexOf("/") + 1)}`,
      );
      winner = await Promise.any(restBatch.map((p) => tryFetch(url, p, 10000)));
    }
    // ──────────────────────────────────────────────────────────

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
    console.error(`[Proxy Error] 40 free proxies failed for ${url}`);
    return new NextResponse("All free proxies blocked. Try again.", {
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
