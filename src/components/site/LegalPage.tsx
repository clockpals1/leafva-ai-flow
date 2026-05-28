type Section = { h: string; p: string };
type Props = { title: string; intro: string; sections: Section[] };

export function LegalPage({ title, intro, sections }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">Legal</div>
      <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-6 text-muted-foreground leading-relaxed">{intro}</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-semibold text-foreground">{s.h}</h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-CA")}</p>
    </div>
  );
}
