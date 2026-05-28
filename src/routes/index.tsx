import { createFileRoute, Link } from "@tanstack/react-router";
import heroLeaf from "@/assets/hero-leaf.jpg";
import { AIChatPreview } from "@/components/site/AIChatPreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEAFVA — IT Intelligence, Powered by Nature and Technology" },
      { name: "description", content: "Premium IT support, AI, networking, systems and applications for Ontario businesses. Start a conversation with the LEAFVA AI assistant." },
      { property: "og:title", content: "LEAFVA — IT Intelligence, Powered by Nature and Technology" },
      { property: "og:description", content: "Premium IT support, AI, networking, systems and applications for Ontario businesses." },
      { property: "og:image", content: heroLeaf },
      { name: "twitter:image", content: heroLeaf },
    ],
  }),
  component: Index,
});

const services = [
  { title: "IT Support", desc: "Responsive support for endpoints, infrastructure and incident resolution.", num: "01" },
  { title: "AI Services", desc: "Custom AI assistants, automations and intelligent workflows.", num: "02" },
  { title: "Networking & Cable Run", desc: "Structured cabling, wireless and enterprise network design.", num: "03" },
  { title: "System Administration", desc: "Windows, Linux, virtualization, identity and cloud hardening.", num: "04" },
  { title: "Application Design", desc: "Modern web and internal applications, built for scale.", num: "05" },
  { title: "Subcontracted Technical Services", desc: "White-label execution for partners and integrators.", num: "06" },
];

function Index() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <img
          src={heroLeaf}
          alt=""
          width={1920}
          height={1280}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border-hairline bg-card/50 px-3 py-1 text-xs text-gold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot" />
              Ontario · IT Intelligence
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight">
              IT Intelligence,
              <br />
              <span className="text-gradient-gold">grown for your business.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              LEAFVA blends nature-grade reliability with modern AI to deliver IT support,
              networking, system administration and applications — all coordinated by a
              single intelligent assistant.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/ai-assistant"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:shadow-gold transition-shadow"
              >
                Tell LEAFVA what you need
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full border-hairline px-6 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Explore services
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-8 text-xs text-muted-foreground">
              <div><div className="text-foreground font-semibold text-lg">24/7</div>AI intake</div>
              <div><div className="text-foreground font-semibold text-lg">&lt; 15 min</div>Avg. response</div>
              <div><div className="text-foreground font-semibold text-lg">100%</div>Ontario-based</div>
            </div>
          </div>
          <div className="lg:col-span-5 animate-leaf-float">
            <AIChatPreview />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative bg-grain">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold">Services</div>
              <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
                Six disciplines. <span className="text-gradient-leaf">One intelligent partner.</span>
              </h2>
            </div>
            <Link to="/services" className="text-sm text-muted-foreground hover:text-gold">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40 rounded-3xl overflow-hidden border-hairline">
            {services.map((s) => (
              <div key={s.num} className="group relative bg-card p-8 hover:bg-accent transition-colors">
                <div className="text-xs font-mono text-gold/70">{s.num}</div>
                <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                <div className="mt-6 h-px w-12 bg-gold/40 group-hover:w-24 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border-hairline bg-gradient-to-br from-card via-background to-card p-12 md:p-16">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
              Skip the forms. <span className="text-gradient-gold">Just describe it.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Our AI assistant categorizes your request, qualifies urgency, opens a ticket,
              and routes the right specialist — all before your coffee gets cold.
            </p>
            <Link
              to="/ai-assistant"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:shadow-gold transition-shadow"
            >
              Start a conversation →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
