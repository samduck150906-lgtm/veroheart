import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";

export function WaitlistSection() {
  return (
    <section
      id="waitlist"
      className="bg-ink-950 py-20 sm:py-28"
      aria-labelledby="waitlist-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
                출시 알림
              </span>
              <h2
                id="waitlist-heading"
                className="mt-5 text-balance text-3xl font-extrabold leading-[1.15] tracking-tightest text-paper sm:text-4xl"
              >
                베로로 출시 소식,
                <br />
                가장 먼저 받아보세요.
              </h2>
              <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-ink-300">
                정식 출시와 베타테스트 모집 소식을 보내드릴게요. 광고성
                메시지를 무분별하게 보내지 않아요.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="mx-auto w-full max-w-md rounded-2xl bg-paper p-6 sm:p-8">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
