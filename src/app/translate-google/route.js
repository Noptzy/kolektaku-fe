import { NextResponse } from "next/server";
import { translate } from "@vitalets/google-translate-api";
import { translate as bingTranslate } from "bing-translate-api";
import axios from "axios";
import NodeCache from "node-cache";
import { HttpsProxyAgent } from "https-proxy-agent";

const translationCache = new NodeCache({ stdTTL: 86400 });
let cachedProxies = [];
let lastFetch = 0;

async function getProxies() {
  const now = Date.now();
  if (cachedProxies.length > 100 && now - lastFetch < 30 * 60 * 1000) return cachedProxies;
  
  try {
    const sources = [
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
      "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
    ];

    const results = await Promise.allSettled(sources.map(s => axios.get(s, { timeout: 8000 })));
    let all = [];
    results.forEach(r => {
      if (r.status === "fulfilled" && typeof r.value.data === 'string') {
        const lines = r.value.data.split("\n")
          .map(l => l.trim())
          .filter(l => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l));
        all.push(...lines.map(l => `http://${l}`));
      }
    });

    cachedProxies = [...new Set(all)].sort();
    lastFetch = now;
    console.log(`[Translate Proxy] Loaded ${cachedProxies.length} proxies`);
    return cachedProxies;
  } catch (e) { 
    return cachedProxies; 
  }
}

function applyInformalStyle(text) {
  if (!text) return text;
  let s = text;
  s = s.replace(/\bSaya\b/gi, "Aku").replace(/\bAnda\b/gi, "Kamu").replace(/\bKami\b/gi, "Kita");
  s = s.replace(/\bTidak\b/gi, "Gak").replace(/\bBelum\b/gi, "Belom").replace(/\bTetapi\b/gi, "Tapi").replace(/\bNamun\b/gi, "Tapi");
  s = s.replace(/\bSudah\b/gi, "Udah").replace(/\bMelihat\b/gi, "Liat");
  return s;
}

async function translateWithRetry(text, from, to) {
  const proxies = await getProxies();
  const engines = [
    { name: "Google", fn: (agent) => translate(text, { client: "gtx", to: to || "id", fetchOptions: { agent } }) },
    { name: "Bing", fn: (agent) => bingTranslate(text, from || "en", to || "id", { fetchOptions: { agent } }) }
  ];

  // Shuffled candidates for translation (less deterministic than video proxy)
  const candidates = proxies.sort(() => Math.random() - 0.5).slice(0, 10);
  candidates.unshift(null); // Try DIRECT first

  for (const proxy of candidates) {
    const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
    for (const engine of engines) {
      try {
        const res = await engine.fn(agent);
        const resultText = res.text || res.translation;
        if (resultText) return resultText;
      } catch (e) {
        // Continue to next proxy/engine
      }
    }
  }
  throw new Error("All translation attempts failed");
}

export async function POST(request) {
  try {
    const { text, from, to } = await request.json();
    if (!text) return new NextResponse("Text is required", { status: 400 });

    const cacheKey = `${text}_${to || "id"}`;
    const cached = translationCache.get(cacheKey);
    if (cached) return NextResponse.json({ text: cached });

    const translated = await translateWithRetry(text, from, to);
    const finalResult = (to === "id" || !to) ? applyInformalStyle(translated) : translated;
    
    translationCache.set(cacheKey, finalResult);
    return NextResponse.json({ text: finalResult });
  } catch (error) {
    console.error(`[Translate Error] ${error.message}`);
    return new NextResponse(error.message, { status: 500 });
  }
}

