import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display font-semibold tracking-[0.2em] text-gradient-leaf">LEAFVA</div>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            IT Intelligence, powered by nature and technology. Ontario-registered IT services
            for businesses that demand precision.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">
            Ontario Registration #: <span className="text-foreground/80">Pending publication</span>
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-gold uppercase tracking-wider mb-3">Company</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/services" className="hover:text-foreground">Services</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold text-gold uppercase tracking-wider mb-3">Legal</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Use</Link></li>
            <li><Link to="/ai-disclaimer" className="hover:text-foreground">AI Disclaimer</Link></li>
            <li><Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LEAFVA. All rights reserved.
      </div>
    </footer>
  );
}
