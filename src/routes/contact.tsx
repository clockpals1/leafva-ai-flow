import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact LEAFVA" },
      { name: "description", content: "Reach LEAFVA via our AI assistant or email. Ontario-based IT services." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">Contact</div>
      <h1 className="mt-3 font-display text-5xl md:text-6xl font-semibold tracking-tight">
        No forms. <span className="text-gradient-gold">Just talk to LEAFVA.</span>
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        Our AI assistant handles intake, qualifies your request, and opens a ticket — faster than any form.
      </p>
      <Link
        to="/ai-assistant"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:shadow-gold transition-shadow"
      >
        Open the assistant →
      </Link>
      <div className="mt-16 grid sm:grid-cols-2 gap-px bg-border/40 rounded-2xl overflow-hidden border-hairline text-left">
        <div className="bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-gold">Email</div>
          <div className="mt-2 text-foreground">hello@leafva.com</div>
        </div>
        <div className="bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-gold">Location</div>
          <div className="mt-2 text-foreground">Ontario, Canada</div>
        </div>
      </div>
    </div>
  );
}
