import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resume, TRACKS } from "@/lib/resume";
import { CvDocument } from "../cv-document";

export function generateStaticParams() {
  return TRACKS.map((t) => ({ track: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/cv/[track]">): Promise<Metadata> {
  const { track } = await params;
  const focus = TRACKS.find((t) => t.id === track);
  return {
    title: `CV · ${focus?.label ?? ""} · ${resume.basics.name}`,
    description: `${resume.basics.name}'s CV, focused on ${focus?.label.toLowerCase()} roles.`,
    alternates: { canonical: `/cv/${focus?.id}` },
  };
}

/** The CV tailored to one role focus: /cv/backend, /cv/fullstack, /cv/ml. */
export default async function TrackCvPage({ params }: PageProps<"/cv/[track]">) {
  const { track } = await params;
  const focus = TRACKS.find((t) => t.id === track);
  if (!focus) notFound();
  return <CvDocument track={focus.id} />;
}
