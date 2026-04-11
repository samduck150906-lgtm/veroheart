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
    <div className={`mb-10 max-w-2xl ${alignClass}`}>
      {kicker && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold-deep">
          {kicker}
        </p>
      )}
      <h2
        id={id}
        className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-ink-800/80">
          {description}
        </p>
      )}
    </div>
  );
}
