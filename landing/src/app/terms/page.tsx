import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_DOC } from "@/lib/legal";

export const metadata: Metadata = {
  title: "이용약관 · VeRoRo",
  description: "VeRoRo(베로로) 서비스 이용약관",
};

export default function TermsPage() {
  return <LegalDocument doc={TERMS_DOC} />;
}
