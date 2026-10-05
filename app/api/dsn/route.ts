import { parseConfig, parseDsn, summarizeDsn, type DsnConfig } from "@/lib/dsn";

// Fixed upstream URLs: nothing from the request ever reaches a fetch.
const FEED_URL = "https://eyes.nasa.gov/dsn/data/dsn.xml";
const CONFIG_URL = "https://eyes.nasa.gov/dsn/config.xml";
const MAX_CHARS = 500_000;
const CONFIG_TTL_MS = 86_400_000;

const NO_STORE = { "Cache-Control": "no-store" };
// NASA updates the feed every few seconds; one shared copy per 30 s keeps us a polite client.
const SHARED = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_CHARS) throw new Error("upstream response too large");
  return text;
}

let config: { value: DsnConfig; at: number } | null = null;

async function getConfig(): Promise<DsnConfig> {
  if (config && Date.now() - config.at < CONFIG_TTL_MS) return config.value;
  const value = parseConfig(await fetchText(CONFIG_URL));
  config = { value, at: Date.now() };
  return value;
}

export async function GET() {
  try {
    const [feed, cfg] = await Promise.all([
      fetchText(`${FEED_URL}?r=${Math.floor(Date.now() / 10_000)}`),
      getConfig(),
    ]);
    return Response.json({ fetchedAt: Date.now(), ...summarizeDsn(parseDsn(feed), cfg) }, { headers: SHARED });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
