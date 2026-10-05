import "server-only";
import { Redis } from "@upstash/redis";

// Credentials come from the Upstash Marketplace integration and only ever
// exist on the server. Reads use the read-only token; only the POST handler
// gets a client with write access.

function client(token: string | undefined): Redis | null {
  const url = process.env.KV_REST_API_URL;
  if (!url || !token) return null;
  return new Redis({
    url,
    token,
    enableTelemetry: false,
    retry: { retries: 1, backoff: () => 150 },
    signal: () => AbortSignal.timeout(3000),
  });
}

let reader: Redis | null | undefined;
let writer: Redis | null | undefined;

export function getReader(): Redis | null {
  if (reader === undefined) reader = client(process.env.KV_REST_API_READ_ONLY_TOKEN);
  return reader;
}

export function getWriter(): Redis | null {
  if (writer === undefined) writer = client(process.env.KV_REST_API_TOKEN);
  return writer;
}
