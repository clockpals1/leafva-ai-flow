import { Link } from "@tanstack/react-router";
import logo from "@/assets/leafva-logo.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/ai-assistant", label: "AI Assistant" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="LEAFVA" width={32} height={32} className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="font-display font-semibold tracking-[0.2em] text-sm text-gradient-leaf">LEAFVA</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-gold" }}
              className="hover:text-foreground transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/ai-assistant"
          className="hidden sm:inline-flex items-center gap-2 rounded-full border-hairline px-4 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot" />
          Talk to LEAFVA AI
        </Link>
      </div>
    </header>
  );
}
