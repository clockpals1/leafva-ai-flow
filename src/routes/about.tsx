import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LEAFVA — Ontario IT Services" },
      { name: "description", content: "LEAFVA is an Ontario-registered IT services company providing support, AI, networking, systems and applications." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">About</div>
      <h1 className="mt-3 font-display text-5xl md:text-6xl font-semibold tracking-tight">
        Built for businesses that <span className="text-gradient-gold">don't have time for friction.</span>
      </h1>
      <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
        LEAFVA is an Ontario-registered IT services company. We combine traditional engineering
        discipline with modern AI to deliver support that feels effortless — and infrastructure
        that quietly works in the background.
      </p>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
        Our brand draws from nature: resilience, growth, and quiet strength. Our delivery draws
        from the best of modern technology: automation, intelligence, and speed.
      </p>

      <div className="mt-16 grid sm:grid-cols-3 gap-px bg-border/40 rounded-2xl overflow-hidden border-hairline">
        <div className="bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-gold">Registration</div>
          <div className="mt-2 text-foreground font-medium">Ontario, Canada</div>
          <div className="mt-1 text-xs text-muted-foreground">Reg # pending publication</div>
        </div>
        <div className="bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-gold">Email</div>
          <div className="mt-2 text-foreground font-medium">hello@leafva.com</div>
        </div>
        <div className="bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-gold">Coverage</div>
          <div className="mt-2 text-foreground font-medium">Ontario · Remote anywhere</div>
        </div>
      </div>
    </div>
  );
}
