import express from "express";
import cors from "cors";
import axios from "axios";
import { translate } from "@vitalets/google-translate-api";
import { translate as bingTranslate } from "bing-translate-api";
import { HttpsProxyAgent } from "https-proxy-agent";
import NodeCache from "node-cache";

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

// --- Global error handlers ---
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Rejection:", reason?.message || reason);
});

app.use(cors());
app.use(express.json());

const translationCache = new NodeCache({ stdTTL: 86400 });

// --- Proxy Rotation ---
let proxyList = [];
let currentProxyIndex = 0;
let proxyEnabled = false;

function getNextProxy() {
  if (!proxyEnabled || proxyList.length === 0) return null;
  const proxy = proxyList[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
  return proxy;
}

async function fetchFreeProxies() {
  console.log("🔍 Fetching free proxies...");
  const sources = [
    "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
  ];

  let allProxies = [];
  for (const url of sources) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const lines = response.data
        .split("\n")
        .filter((l) => l.trim().match(/^\d+\.\d+\.\d+\.\d+:\d+$/));
      allProxies.push(...lines.map((l) => `http://${l.trim()}`));
    } catch (e) {
      console.warn(`  ⚠️ Failed: ${url.substring(0, 50)}...`);
    }
  }
  return [...new Set(allProxies)];
}

async function testProxy(proxyUrl, timeoutMs = 8000) {
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const result = await translate("hello", {
      client: "gtx",
      to: "id",
      fetchOptions: { agent, signal: controller.signal },
    });
    clearTimeout(timer);
    return !!(result && result.text);
  } catch {
    return false;
  }
}

async function loadWorkingProxies(maxToTest = 30, maxWorking = 5) {
  const allProxies = await fetchFreeProxies();
  if (allProxies.length === 0) return;

  const shuffled = allProxies.sort(() => Math.random() - 0.5);
  const toTest = shuffled.slice(0, maxToTest);
  console.log(`🧪 Testing ${toTest.length} proxies...`);
  const working = [];

  for (let i = 0; i < toTest.length && working.length < maxWorking; i += 5) {
    const batch = toTest.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (proxy) => {
        const ok = await testProxy(proxy);
        if (ok) console.log(`  ✅ ${proxy}`);
        return { proxy, ok };
      }),
    );
    results.filter((r) => r.ok).forEach((r) => working.push(r.proxy));
  }

  if (working.length > 0) {
    proxyList = working;
    currentProxyIndex = 0;
    proxyEnabled = true;
    console.log(`🎉 ${working.length} working proxies loaded!`);
  } else {
    proxyEnabled = false;
    console.log("😞 No working proxies. Using direct connection.");
  }
}

// --- Informal Indonesian style ---
function applyInformalStyle(text) {
  if (!text) return text;
  let s = text;
  s = s.replace(/\bSaya\b/gi, "Aku");
  s = s.replace(/\bAnda\b/gi, "Kamu");
  s = s.replace(/\bKami\b/gi, "Kita");
  s = s.replace(/\bBeliau\b/gi, "Dia");
  s = s.replace(/\bApakah\b/gi, "Apa");
  s = s.replace(/\bBagaimana\b/gi, "Gimana");
  s = s.replace(/\bMengapa\b/gi, "Kenapa");
  s = s.replace(/\bDi mana\b/gi, "Dimana");
  s = s.replace(/\bKe mana\b/gi, "Kemana");
  s = s.replace(/\bTidak\b/gi, "Gak");
  s = s.replace(/\bBelum\b/gi, "Belom");
  s = s.replace(/\bTetapi\b/gi, "Tapi");
  s = s.replace(/\bNamun\b/gi, "Tapi");
  s = s.replace(/\bKemudian\b/gi, "Terus");
  s = s.replace(/\bLalu\b/gi, "Terus");
  s = s.replace(/\bKarena\b/gi, "Soalnya");
  s = s.replace(/\bSangat\b/gi, "Banget");
  s = s.replace(/\bBenar\b/gi, "Bener");
  s = s.replace(/\bSedang\b/gi, "Lagi");
  s = s.replace(/\bHanya\b/gi, "Cuma");
  s = s.replace(/\bSaja\b/gi, "Aja");
  s = s.replace(/\bSudah\b/gi, "Udah");
  s = s.replace(/\bMengatakan\b/gi, "Bilang");
  s = s.replace(/\bBerkata\b/gi, "Bilang");
  s = s.replace(/\bMemberitahu\b/gi, "Kasih tau");
  s = s.replace(/\bMengetahui\b/gi, "Tau");
  s = s.replace(/\bMelihat\b/gi, "Liat");
  s = s.replace(/\bSeperti apa\b/gi, "Kayak gimana");
  s = s.replace(/\bSeperti\b/gi, "Kayak");
  s = s.replace(/\bTerima kasih\b/gi, "Makasih");
  return s;
}

// --- Translation Engines ---
async function translateWithGoogleDirect(text, from, to) {
  const result = await translate(text, { client: "gtx", to: to || "id" });
  return result.text;
}

async function translateWithBing(text, from, to) {
  const MAX = 900;
  if (text.length <= MAX) {
    const result = await bingTranslate(text, from || "en", to || "id");
    return result.translation;
  }
  const lines = text.split("\n");
  let chunks = [],
    current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > MAX && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const r = await bingTranslate(chunk, from || "en", to || "id");
        return r.translation;
      } catch {
        return chunk;
      }
    }),
  );
  return results.join("\n");
}

async function translateWithMyMemory(text, from, to) {
  const langPair = `${from || "en"}|${to || "id"}`;
  const MAX = 490;
  if (text.length <= MAX) {
    const r = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: text, langpair: langPair },
      timeout: 15000,
    });
    if (r.data?.responseData) return r.data.responseData.translatedText;
    throw new Error("Empty response");
  }
  const lines = text.split("\n");
  let chunks = [],
    current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > MAX && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const r = await axios.get("https://api.mymemory.translated.net/get", {
          params: { q: chunk, langpair: langPair },
          timeout: 15000,
        });
        return r.data?.responseData?.translatedText || chunk;
      } catch {
        return chunk;
      }
    }),
  );
  return results.join("\n");
}

function withTimeout(fn, ms, name) {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} timeout`)), ms);
    try {
      const r = await fn();
      clearTimeout(timer);
      resolve(r);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

// --- Routes ---
app.post("/translate-google", async (req, res) => {
  const { text, from, to } = req.body;
  if (!text) return res.status(400).send("Text is required");

  const cacheKey = `${text}_${to || "id"}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return res.json({ text: cached, engine: "cache" });

  const engines = [
    {
      name: "Google-Direct",
      fn: () => translateWithGoogleDirect(text, from, to),
    },
    { name: "Bing", fn: () => translateWithBing(text, from, to) },
    { name: "MyMemory", fn: () => translateWithMyMemory(text, from, to) },
  ];

  const racers = engines.map(({ name, fn }) =>
    withTimeout(fn, 8000, name)
      .then((text) => ({ text, engine: name }))
      .catch((e) => Promise.reject({ engine: name, error: e })),
  );

  const settled = await Promise.allSettled(racers);
  for (const result of settled) {
    if (result.status === "fulfilled") {
      let { text: translated, engine } = result.value;
      if ((!to || to === "id") && translated)
        translated = applyInformalStyle(translated);
      translationCache.set(cacheKey, translated);
      console.log(`[${engine}] ✅ ${translated.substring(0, 60)}...`);
      return res.json({ text: translated, engine });
    }
  }
  res.status(500).json({ error: "All translation engines failed" });
});

app.get("/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("URL is required");

  try {
    const response = await axios.get(url, {
      responseType: "stream",
      timeout: 30000,
      headers: {
        Referer: "https://rapid-cloud.co/",
        Origin: "https://rapid-cloud.co",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      },
    });

    // Copy essential headers
    if (response.headers["content-type"]) res.setHeader("Content-Type", response.headers["content-type"]);
    if (response.headers["content-length"]) res.setHeader("Content-Length", response.headers["content-length"]);
    if (response.headers["accept-ranges"]) res.setHeader("Accept-Ranges", response.headers["accept-ranges"]);

    // Add CORS headers for video player
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");

    response.data.pipe(res);
  } catch (error) {
    console.error(`Proxy Error: ${url} — ${error.message}`);
    res.status(error.response?.status || 500).send("Proxy error occurred");
  }
});

app.get("/proxy-status", (req, res) => {
  res.json({
    enabled: proxyEnabled,
    count: proxyList.length,
    proxies: proxyList,
  });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  await loadWorkingProxies();
  if (proxyEnabled) {
    console.log(`✅ Proxy rotation active with ${proxyList.length} proxies.`);
  } else {
    console.log("⚠️  No working proxies. Using direct connection.");
  }
});
