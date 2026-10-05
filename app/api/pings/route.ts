import { hashIp, isSameOrigin, readPings, recordPing } from "@/lib/pingStore";
import { getReader, getWriter } from "@/lib/redis";

const NO_STORE = { "Cache-Control": "no-store" };
// Everyone sees the same counts, so Vercel's CDN serves them a minute at a
// time. Browsers never cache them, so nobody is shown a stale count.
const SHARED = {
  "Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "max-age=60, stale-while-revalidate=300",
};

const unavailable = () => Response.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });

export async function GET() {
  const store = getReader();
  if (!store) return unavailable();
  try {
    return Response.json(await readPings(store, Date.now()), { headers: SHARED });
  } catch {
    return unavailable();
  }
}

// A ping carries no content: no body is read, nothing a visitor types is sent.
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }
  const store = getWriter();
  const salt = process.env.PING_SALT;
  if (!store || !salt) return unavailable();

  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  try {
    const now = Date.now();
    const result = await recordPing(store, hashIp(ip, salt), now);
    if (!result.ok) return Response.json({ error: result.reason }, { status: 429, headers: NO_STORE });
    // Fresh counts straight after the write, so the sender's page is exact.
    return Response.json(await readPings(store, now), { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}
