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
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`mb-12 max-w-2xl ${alignClass}`}>
      {kicker && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-gold-deep ring-1 ring-gold-muted/60">
          {kicker}
        </p>
      )}
      <h2
        id={id}
        className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-ink-800/75 sm:text-[1.0625rem]">
          {description}
        </p>
      )}
    </div>
  );
}
