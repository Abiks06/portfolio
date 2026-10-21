import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { GITHUB_CACHE_TAG } from "@/lib/github";

/**
 * GitHub webhook target. Point a user- or repo-level webhook at
 * /api/revalidate (content type application/json, secret = REVALIDATE_SECRET)
 * and every push refreshes the cached GitHub data.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return Response.json({ error: "Revalidation is not configured" }, { status: 500 });

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  const valid =
    signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return Response.json({ error: "Invalid signature" }, { status: 401 });

  revalidateTag(GITHUB_CACHE_TAG, "max");
  return Response.json({ revalidated: true, event: request.headers.get("x-github-event") });
}
