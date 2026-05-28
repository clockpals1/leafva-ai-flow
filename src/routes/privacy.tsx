import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
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
