type Props = {
  kicker?: string;
  id?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  kicker,
  id,
  title,
  description,
  align = "left",
}: Props) {
  const alignClass =
    align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <div className={`mb-12 flex max-w-2xl flex-col ${alignClass}`}>
      {kicker && (
        <span className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
          <span className="h-[3px] w-4 bg-accent" />
          {kicker}
        </span>
      )}
      <h2
        id={id}
        className="text-balance text-[1.75rem] font-extrabold leading-[1.2] tracking-tightest text-ink-950 sm:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-ink-700 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
