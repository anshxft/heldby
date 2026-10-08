import { ImageResponse } from "next/og";
import { MARK } from "@/components/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon: the Hold mark on an ink tile (iOS rounds the corners itself).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0D0D" }}>
        <svg width="132" height="132" viewBox="0 0 100 100">
          <path d={MARK.left} fill="none" stroke="#E4E4E1" strokeWidth={MARK.stroke} strokeLinecap="round" />
          <path d={MARK.right} fill="none" stroke="#E4E4E1" strokeWidth={MARK.stroke} strokeLinecap="round" />
          <rect x={MARK.funds.x} y={MARK.funds.y} width={MARK.funds.size} height={MARK.funds.size} fill="#FF3D2E" />
        </svg>
      </div>
    ),
    size,
  );
}
