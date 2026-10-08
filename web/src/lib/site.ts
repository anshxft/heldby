/** Public site URL: the Vercel production domain when deployed, localhost in dev. Used for canonical/OG/sitemap. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "Heldby";
export const SITE_DESCRIPTION =
  "USDC escrow on Arc. Lock payment in a smart contract; an AI agent checks the work against the brief and releases it. No middleman.";
export const REPO_URL = "https://github.com/anshxft/heldby";
