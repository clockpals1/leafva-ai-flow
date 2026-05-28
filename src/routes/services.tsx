import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — LEAFVA" },
      { name: "description", content: "IT Support, AI Services, Networking, System Administration, Application Design and Subcontracted Technical Services." },
    ],
  }),
  component: Services,
});

const services = [
  { title: "IT Support", desc: "Endpoint, infrastructure and incident management with AI-assisted triage and human escalation.", bullets: ["Helpdesk & remote support", "On-site dispatch", "Patch & vulnerability management"] },
  { title: "AI Services", desc: "Custom AI assistants, automations and intelligent workflows tailored to your operations.", bullets: ["Self-hosted LLM deployments", "AI agents & automations", "Document intelligence"] },
  { title: "Networking & Cable Run", desc: "Structured cabling, wireless and enterprise network design — built to last.", bullets: ["Cat6/6A & fiber runs", "Wi-Fi 6/6E design", "Switching, routing, firewalls"] },
  { title: "System Administration", desc: "Windows, Linux, virtualization, identity, and cloud hardening done right.", bullets: ["Active Directory & Entra ID", "Linux & virtualization", "Backup & disaster recovery"] },
  { title: "Application Design", desc: "Modern web and internal applications, built for scale and longevity.", bullets: ["Full-stack web apps", "Internal tools & dashboards", "API & integration design"] },
  { title: "Subcontracted Technical Services", desc: "White-label execution for partners, MSPs, and integrators.", bullets: ["Field engineering", "Project delivery", "Specialist on-demand"] },
];

function Services() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-24">
      <div className="text-xs uppercase tracking-[0.25em] text-gold">Services</div>
      <h1 className="mt-3 font-display text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl">
        The full IT spectrum — <span className="text-gradient-gold">coordinated by AI.</span>
      </h1>

      <div className="mt-16 grid gap-px bg-border/40 rounded-3xl overflow-hidden border-hairline md:grid-cols-2">
        {services.map((s, i) => (
          <article key={s.title} className="bg-card p-8 md:p-10">
            <div className="text-xs font-mono text-gold/70">0{i + 1}</div>
            <h2 className="mt-3 font-display text-2xl font-semibold">{s.title}</h2>
            <p className="mt-3 text-muted-foreground">{s.desc}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-foreground/90">
                  <span className="h-1 w-1 rounded-full bg-gold" /> {b}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link to="/ai-assistant" className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:shadow-gold transition-shadow">
          Tell LEAFVA what you need →
        </Link>
      </div>
    </div>
  );
}
