import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/brand";
import { logoDots } from "@/lib/logo-mark";

export const shareSize = { width: 1200, height: 630 };
export const shareAlt = `${BRAND_NAME} — website stats and uptime. No cookies, and no profile of each visitor.`;

function Mark({ size }) {
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {logoDots().map((dot, index) => {
        const diameter = (dot.r * 2 * size) / 32;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: (dot.cx * size) / 32 - diameter / 2,
              top: (dot.cy * size) / 32 - diameter / 2,
              width: diameter,
              height: diameter,
              borderRadius: 999,
              background: "#ffffff",
            }}
          />
        );
      })}
    </div>
  );
}

export async function shareImage() {
  const font = await readFile(join(process.cwd(), "src/fonts/Geist-Regular.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Geist",
          padding: "72px 80px",
        }}
      >
        <Mark size={300} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 72 }}>
          <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: -2 }}>{BRAND_NAME}</div>
          <div style={{ marginTop: 22, fontSize: 36, color: "#d4d4d8" }}>
            Website stats and uptime
          </div>
          <div style={{ marginTop: 14, fontSize: 28, color: "#a1a1aa" }}>
            No cookies. No profile of each visitor.
          </div>
        </div>
      </div>
    ),
    {
      ...shareSize,
      fonts: [{ name: "Geist", data: font, style: "normal", weight: 400 }],
    },
  );
}
