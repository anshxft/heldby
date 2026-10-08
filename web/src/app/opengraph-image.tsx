import { ImageResponse } from "next/og";
import { MARK } from "@/components/logo";

export const alt = "Heldby — USDC escrow on Arc with an AI arbiter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card (X, WhatsApp, DoraHacks): Swiss layout matching the landing page.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#E4E4E1", padding: 72, color: "#0D0D0D" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <path d={MARK.left} fill="none" stroke="#0D0D0D" strokeWidth={MARK.stroke} strokeLinecap="round" />
            <path d={MARK.right} fill="none" stroke="#0D0D0D" strokeWidth={MARK.stroke} strokeLinecap="round" />
            <rect x={MARK.funds.x} y={MARK.funds.y} width={MARK.funds.size} height={MARK.funds.size} fill="#FF3D2E" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Heldby</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 700, lineHeight: 0.95, letterSpacing: -5 }}>
          <span>Money held in trust,</span>
          <span style={{ color: "#FF3D2E" }}>released when work is done.</span>
        </div>
        <span style={{ fontSize: 28, color: "#6B6B68" }}>USDC escrow on Arc · AI agent settles disputes</span>
      </div>
    ),
    size,
  );
}
