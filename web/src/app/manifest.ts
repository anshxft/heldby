import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — USDC Escrow on Arc`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/app",
    display: "standalone",
    background_color: "#e4e4e1",
    theme_color: "#0d0d0d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
