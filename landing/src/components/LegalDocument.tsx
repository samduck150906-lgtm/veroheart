import Link from "next/link";
import type { LegalDoc } from "@/lib/legal";

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="text-sm font-semibold text-gold-deep underline-offset-2 hover:underline"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          {doc.title}
        </h1>
        <p className="mt-2 text-sm text-ink-800/65">시행일: {doc.effective}</p>

        {doc.intro && (
          <p className="mt-8 text-sm leading-relaxed text-ink-800/90 sm:text-[15px]">
            {doc.intro}
          </p>
        )}

        <div className="mt-8 space-y-8">
          {doc.sections.map((sec) => (
            <section key={sec.heading}>
              <h2 className="text-base font-bold text-ink-900">{sec.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-800/90 sm:text-[15px]">
                {sec.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {sec.listItems && sec.listItems.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5">
                    {sec.listItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
