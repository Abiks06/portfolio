import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { GITHUB_CACHE_TAG } from "@/lib/github";

/**
 * Manual "refresh now" for GitHub data, e.g. right after tagging a new repo.
 * Open /api/revalidate?secret=<REVALIDATE_SECRET> or send the secret as
 * `Authorization: Bearer <secret>`. Without it the site still refreshes every 15 minutes.
 */
export async function GET(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "Revalidation is not configured" }, { status: 500 });

  const provided =
    new URL(request.url).searchParams.get("secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  const valid = provided.length === secret.length && timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  if (!valid) return Response.json({ error: "Invalid secret" }, { status: 401 });

  revalidateTag(GITHUB_CACHE_TAG, "max");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
