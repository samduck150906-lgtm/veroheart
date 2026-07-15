import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";

export function WaitlistSection() {
  return (
    <section
      id="waitlist"
      className="border-b border-ink-800/10 bg-warm-fade py-20 sm:py-24"
      aria-labelledby="waitlist-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28 lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-muted/70 bg-white px-3.5 py-1.5 text-xs font-bold text-gold-darker">
                출시 알림
              </span>
              <h2
                id="waitlist-heading"
                className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl"
              >
                베로로 출시 소식,
                <br />
                가장 먼저 받아보세요.
              </h2>
              <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-ink-800/75">
                정식 출시와 베타테스트 모집 소식을 보내드릴게요. 광고성
                메시지를 무분별하게 보내지 않아요.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="mx-auto w-full max-w-md rounded-3xl border border-ink-800/10 bg-white p-6 sm:p-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
