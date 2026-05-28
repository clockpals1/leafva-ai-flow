import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Use — LEAFVA" }] }),
  component: () => (
    <LegalPage
      title="Terms of Use"
      intro="By using leafva.com or engaging LEAFVA for services, you agree to these terms."
      sections={[
        { h: "Services", p: "LEAFVA provides IT support, AI, networking, system administration, and application design. Specific scope is defined per engagement." },
        { h: "Acceptable Use", p: "You agree not to use our website or assistant for unlawful purposes or to attempt to disrupt our systems." },
        { h: "Intellectual Property", p: "All content, branding, and assistant behavior is owned by LEAFVA unless otherwise noted." },
        { h: "Liability", p: "Services are provided as-is unless otherwise stated in a signed engagement agreement. Our liability is limited to fees paid for the relevant service." },
        { h: "Governing Law", p: "These terms are governed by the laws of the Province of Ontario, Canada." },
      ]}
    />
  ),
});
