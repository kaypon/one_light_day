import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Voyager 1 reaches one light-day from Earth on Nov 18, 2026, at 10:16:07 UTC.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f2f2f0";
const INK = "#191611";
const MUTED = "#756b59";
const SIGNAL = "#ff4f00";
const SIGNAL_TEXT = "#c23b00";

// Static, built at deploy time. Worded to stay true before and after the moment.
export default async function Image() {
  const [display, mono] = await Promise.all([
    readFile(join(process.cwd(), "assets/ArchivoBlack-Regular.ttf")),
    readFile(join(process.cwd(), "assets/DejaVuSansMono.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px 60px",
          background: PAPER,
          color: INK,
          fontFamily: "Mono",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: MUTED }}>
          <span>Voyager 1, launched Sept 5, 1977</span>
          <span>Not to scale</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Display", fontSize: 230, lineHeight: 0.9, letterSpacing: -1 }}>
            24:00:00
          </div>
          <div style={{ fontFamily: "Display", fontSize: 58, lineHeight: 1.05, marginTop: 18 }}>
            One light-day from Earth.
          </div>
          <div style={{ fontSize: 30, marginTop: 14 }}>Wed, Nov 18, 2026, 10:16:07 UTC</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", fontSize: 20, letterSpacing: 1.5 }}>
          <svg width="26" height="26" viewBox="0 0 18 18" fill="none" stroke={INK} strokeWidth="1.4">
            <circle cx="9" cy="9" r="7.3" />
            <path d="M9 1.7 V16.3 M1.7 9 H16.3" />
          </svg>
          <span style={{ marginLeft: 10 }}>EARTH</span>
          <div style={{ display: "flex", flexGrow: 1, height: 2, background: INK, margin: "0 16px" }} />
          <span style={{ fontFamily: "Display", fontSize: 26, margin: "0 6px" }}>//</span>
          <div style={{ display: "flex", flexGrow: 2, height: 2, background: INK, margin: "0 16px" }} />
          <span>VOYAGER 1</span>
          <div
            style={{
              display: "flex",
              width: 120,
              height: 0,
              borderTop: `2px dashed ${MUTED}`,
              margin: "0 16px",
            }}
          />
          <div style={{ display: "flex", width: 3, height: 44, background: SIGNAL, marginRight: 12 }} />
          <span style={{ color: SIGNAL_TEXT }}>1 LIGHT-DAY</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, weight: 400, style: "normal" },
        { name: "Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
