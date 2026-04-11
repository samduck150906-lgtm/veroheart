import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_DOC } from "@/lib/legal";

export const metadata: Metadata = {
  title: "개인정보처리방침 · VeRoRo",
  description: "VeRoRo(베로로) 개인정보처리방침",
};

export default function PrivacyPage() {
  return <LegalDocument doc={PRIVACY_DOC} />;
}
