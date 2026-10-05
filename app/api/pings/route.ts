import { hashIp, isSameOrigin, readPings, recordPing } from "@/lib/pingStore";
import { getReader, getWriter } from "@/lib/redis";

const NO_STORE = { "Cache-Control": "no-store" };
// Everyone sees the same counts, so the CDN can serve them a minute at a time.
const SHARED = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

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
    const result = await recordPing(store, hashIp(ip, salt), Date.now());
    if (!result.ok) return Response.json({ error: result.reason }, { status: 429, headers: NO_STORE });
    return Response.json({ total: result.total }, { headers: NO_STORE });
  } catch {
    return unavailable();
  }
}
