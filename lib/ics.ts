// Minimal RFC 5545 calendar file for "+ CALENDAR". Built client-side; nothing is sent anywhere.

export type IcsEvent = {
  uid: string;
  startMs: number;
  durationMin: number;
  title: string;
  description: string;
  url: string;
  stampMs: number;
};

/** 2026-11-18T10:16:07.000Z → 20261118T101607Z */
const utcStamp = (ms: number) =>
  new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

/** Splits a content line into ≤75-octet pieces; continuations start with a space. */
function fold(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (size + n > limit) {
      out.push(out.length === 0 ? current : ` ${current}`);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(out.length === 0 ? current : ` ${current}`);
  return out;
}

export function buildIcs(e: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//one-light-day//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${utcStamp(e.stampMs)}`,
    `DTSTART:${utcStamp(e.startMs)}`,
    `DTEND:${utcStamp(e.startMs + e.durationMin * 60_000)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    `URL:${e.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.flatMap(fold).join("\r\n") + "\r\n";
}
