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
  align = "center",
}: Props) {
  const alignClass =
    align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <div className={`mb-12 flex max-w-2xl flex-col ${alignClass}`}>
      {kicker && (
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold-muted/70 bg-gold-soft/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-gold-darker">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-gradient" />
          {kicker}
        </span>
      )}
      <h2
        id={id}
        className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[2.15rem]"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-ink-800/75 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
