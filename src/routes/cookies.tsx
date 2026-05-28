import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — LEAFVA" }] }),
  component: () => (
    <LegalPage
      title="Cookie Policy"
      intro="We use a minimal set of cookies to operate leafva.com and improve your experience."
      sections={[
        { h: "Essential Cookies", p: "Required for the website to function correctly, including session and security cookies." },
        { h: "Analytics", p: "We may use privacy-respecting analytics to understand site usage. No personal identifiers are sold." },
        { h: "Your Choices", p: "You can disable cookies in your browser settings. Some site features may not work without essential cookies." },
      ]}
    />
  ),
});
