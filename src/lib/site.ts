/**
 * Public URL of the site, for canonical links, the sitemap and share previews.
 * NEXT_PUBLIC_SITE_URL wins (set it for a custom domain); otherwise Vercel's
 * production domain, which Vercel injects at build time.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
