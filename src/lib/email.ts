export type EmailConfig = { apiKey: string; fromEmail: string; fromName?: string };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  config: EmailConfig,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const from = config.fromName
      ? `${config.fromName} <${config.fromEmail}>`
      : config.fromEmail;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] Resend error:", res.status, text);
      return { ok: false, error: text };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { ok: false, error: String(err) };
  }
}

export function ticketCreatedCustomerHtml(opts: {
  reference: string;
  customerName?: string | null;
  summary?: string | null;
  urgency?: string | null;
}) {
  const name = opts.customerName || "there";
  const summary = opts.summary || "Your support request";
  const urgency = opts.urgency || "medium";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
    <div style="background:#0f172a;padding:24px 32px">
      <p style="color:#6366f1;font-weight:700;font-size:13px;margin:0 0 4px;letter-spacing:.08em;text-transform:uppercase">LEAFVA Support</p>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">We received your request</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#334155;margin:0 0 16px;font-size:15px">Hi ${escHtml(name)},</p>
      <p style="color:#334155;margin:0 0 24px;font-size:15px">Thanks for reaching out. Our team has your request and will be in touch shortly.</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:700">Your ticket reference</p>
        <p style="margin:0;font-size:24px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;letter-spacing:.04em">${escHtml(opts.reference)}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:110px">Summary</td><td style="padding:6px 0;color:#334155;font-weight:500">${escHtml(summary)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Priority</td><td style="padding:6px 0;color:#334155;font-weight:500;text-transform:capitalize">${escHtml(urgency)}</td></tr>
      </table>
      <p style="color:#64748b;margin:24px 0 0;font-size:13px;line-height:1.6">Keep your reference handy — our team typically responds within 2–4 business hours.</p>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8">Automated confirmation · LEAFVA IT Services · Ontario, Canada</p>
    </div>
  </div>
</body></html>`;
}

export function ticketCreatedStaffHtml(opts: {
  reference: string;
  customerName?: string | null;
  customerEmail?: string | null;
  summary?: string | null;
  urgency?: string | null;
  details?: string | null;
}) {
  const urgencyColor: Record<string, string> = {
    low: "#22c55e", medium: "#f59e0b", high: "#ef4444", emergency: "#7c3aed",
  };
  const color = urgencyColor[opts.urgency ?? "medium"] ?? "#f59e0b";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
    <div style="background:#0f172a;padding:24px 32px">
      <p style="color:#6366f1;font-weight:700;font-size:13px;margin:0 0 4px;letter-spacing:.08em;text-transform:uppercase">LEAFVA Support</p>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;flex:1">New Support Ticket</h1>
        <span style="background:${color};color:#fff;padding:3px 12px;border-radius:99px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em">${escHtml(opts.urgency ?? "medium")}</span>
      </div>
    </div>
    <div style="padding:32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:7px 0;color:#64748b;vertical-align:top;width:120px">Reference</td><td style="padding:7px 0;color:#0f172a;font-weight:700;font-family:'Courier New',monospace">${escHtml(opts.reference)}</td></tr>
        <tr><td style="padding:7px 0;color:#64748b">Customer</td><td style="padding:7px 0;color:#334155;font-weight:500">${escHtml(opts.customerName ?? "Anonymous")}</td></tr>
        <tr><td style="padding:7px 0;color:#64748b">Email</td><td style="padding:7px 0;color:#334155">${escHtml(opts.customerEmail ?? "N/A")}</td></tr>
        <tr><td style="padding:7px 0;color:#64748b;vertical-align:top">Summary</td><td style="padding:7px 0;color:#334155">${escHtml(opts.summary ?? "N/A")}</td></tr>
      </table>
      ${opts.details ? `<div style="margin-top:20px;background:#f8fafc;border-left:3px solid #6366f1;padding:14px 16px;border-radius:0 8px 8px 0"><p style="margin:0;color:#475569;font-size:14px;line-height:1.6;white-space:pre-wrap">${escHtml(opts.details)}</p></div>` : ""}
    </div>
    <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8">LEAFVA Staff Notification · Do not reply to this email</p>
    </div>
  </div>
</body></html>`;
}

export function ticketReplyCustomerHtml(opts: {
  reference: string;
  customerName?: string | null;
  replyBody: string;
  staffName?: string | null;
}) {
  const name = opts.customerName || "there";
  const from = opts.staffName || "Support Team";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
    <div style="background:#0f172a;padding:24px 32px">
      <p style="color:#6366f1;font-weight:700;font-size:13px;margin:0 0 4px;letter-spacing:.08em;text-transform:uppercase">LEAFVA Support</p>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">Reply on your support request</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#334155;margin:0 0 16px;font-size:15px">Hi ${escHtml(name)},</p>
      <p style="color:#334155;margin:0 0 24px;font-size:15px"><strong>${escHtml(from)}</strong> has replied to your request <span style="font-family:'Courier New',monospace;font-weight:700;color:#0f172a">${escHtml(opts.reference)}</span>:</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:20px 22px;margin:0 0 24px;border-left:4px solid #6366f1">
        <p style="margin:0;color:#334155;line-height:1.7;font-size:15px;white-space:pre-wrap">${escHtml(opts.replyBody)}</p>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0;line-height:1.6">If you need to follow up, contact our support team and quote your ticket reference <strong style="font-family:'Courier New',monospace">${escHtml(opts.reference)}</strong>.</p>
    </div>
    <div style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0">
      <p style="margin:0;font-size:11px;color:#94a3b8">LEAFVA IT Services · Ref: ${escHtml(opts.reference)} · Automated message</p>
    </div>
  </div>
</body></html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
