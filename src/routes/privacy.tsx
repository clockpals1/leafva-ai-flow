import { createFileRoute } from "@tanstack/react-router";

type Props = { title: string; intro: string; sections: { h: string; p: string }[] };

function LegalPage({ title, intro, sections }: Props) {
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

export const PrivacyRoute = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — LEAFVA" }] }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      intro="LEAFVA respects your privacy and complies with PIPEDA and applicable Ontario privacy laws. This policy outlines how we collect, use, and protect your information."
      sections={[
        { h: "Information We Collect", p: "We collect only what is necessary to deliver our services — typically your name, email, and a description of the issue or project." },
        { h: "How We Use It", p: "To respond to your inquiry, deliver IT services, send confirmations and follow-ups, and improve our offering." },
        { h: "Data Sharing", p: "We do not sell personal data. We share only with vetted subcontractors when required to deliver requested work." },
        { h: "Retention", p: "We retain records for as long as needed to provide services and meet legal obligations." },
        { h: "Your Rights", p: "You may request access, correction, or deletion of your personal data at any time by emailing hello@leafva.com." },
      ]}
    />
  ),
});
