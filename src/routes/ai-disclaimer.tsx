import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/ai-disclaimer")({
  head: () => ({ meta: [{ title: "AI Disclaimer — LEAFVA" }] }),
  component: () => (
    <LegalPage
      title="AI Disclaimer"
      intro="LEAFVA uses AI assistants to qualify requests, draft responses, and route tickets. The following describes how AI is used and its limitations."
      sections={[
        { h: "How We Use AI", p: "Our assistant categorizes requests, collects relevant context, opens tickets, and may draft automated email follow-ups. A human reviews critical actions." },
        { h: "Accuracy", p: "AI-generated responses may contain inaccuracies. Final advice and engineering work is performed or validated by qualified humans." },
        { h: "Data Use", p: "We minimize the data the AI collects. Sensitive credentials should never be shared through the assistant." },
        { h: "Human Handoff", p: "You can ask to speak with a human at any time, and we will route your request to a specialist." },
      ]}
    />
  ),
});
