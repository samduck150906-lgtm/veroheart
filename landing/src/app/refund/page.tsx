import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { REFUND_DOC } from "@/lib/legal";

export const metadata: Metadata = {
  title: "취소 및 환불 안내 · VeRoRo",
  description: "VeRoRo(베로로) 취소 및 환불 안내",
};

export default function RefundPage() {
  return <LegalDocument doc={REFUND_DOC} />;
}
