import type { Metadata } from "next";
import { resume } from "@/lib/resume";
import { CvDocument } from "./cv-document";

export const metadata: Metadata = {
  title: `CV · ${resume.basics.name}`,
  description: `Printable CV for ${resume.basics.name}, generated from the same data as the portfolio.`,
  alternates: { canonical: "/cv" },
};

export default function CvPage() {
  return <CvDocument />;
}
