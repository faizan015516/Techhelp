/* Cloudflare Pages Function: server-side business enquiry delivery.
   Email provider: Resend. Bot check: Cloudflare Turnstile. No secrets in browser. */
const NO_STORE = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const VALID_SERVICES = new Set([
  "Website AI assistant",
  "WhatsApp inquiry workflow",
  "Appointment-request automation",
  "Combined business automation",
  "Not sure yet"
]);
const PROD_HOSTS = new Set(["printerresolve.com", "www.printerresolve.com"]);
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: NO_STORE });
}
function config(env) {
  return {
    key: String(env.RESEND_API_KEY || "").trim(),
    from: String(env.ENQUIRY_FROM_EMAIL || "").trim(),
    to: String(env.ENQUIRY_TO_EMAIL || "").trim(),
    siteKey: String(env.TURNSTILE_SITE_KEY || "").trim(),
    secret: String(env.TURNSTILE_SECRET_KEY || "").trim()
  };
}
function ready(c) {
  return Boolean(c.key && c.from && c.to && c.siteKey && c.secret);
}
function safeText(value, limit) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, limit);
}
function singleLine(value, limit) {
  return safeText(value, limit).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ");
}
function emailOk(v) {
  return typeof v === "string" && v.length <= 200 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
}
function validOrigin(request) {
  const u = new URL(request.url);
  const origin = request.headers.get("Origin");
  return u.protocol === "https:" && PROD_HOSTS.has(u.hostname) &&
    origin === u.origin;
}
export async function onRequestGet({ env }) {
  const c = config(env);
  // The public sitekey may be exposed. Never send secret keys or addresses.
  return json({ available: ready(c), siteKey: ready(c) ? c.siteKey : null });
}
export async function onRequestPost({ request, env }) {
  const c = config(env);
  if (!ready(c)) return json({ ok: false, code: "not_configured", message: "Direct submissions are not configured yet. Please use the email option." }, 503);
  if (!validOrigin(request)) return json({ ok: false, code: "origin", message: "Please submit this form from printerresolve.com." }, 403);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return json({ ok: false, code: "format", message: "Invalid submission format." }, 415);
  }
  if (Number(request.headers.get("Content-Length") || 0) > 8192) {
    return json({ ok: false, code: "large", message: "Your enquiry is too long." }, 413);
  }
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 8192) return json({ ok: false, code: "large", message: "Your enquiry is too long." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "format", message: "Please submit a valid enquiry." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, code: "format", message: "Please submit a valid enquiry." }, 400);
  }
  // Trap automated scripts that fill fields hidden from human visitors.
  if (body.company_website) return json({ ok: true, message: "Thank you for your enquiry." });
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 2500 || Date.now() - startedAt > 86_400_000) {
    return json({ ok: false, code: "timing", message: "Please reload the page and try again." }, 400);
  }
  const name = singleLine(body.name, 100);
  const business = singleLine(body.business, 120);
  const email = singleLine(body.email, 200);
  const service = singleLine(body.service, 120);
  const message = safeText(body.message, 1200);
  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  if (!name || !business || !emailOk(email) || !VALID_SERVICES.has(service) ||
      message.length < 10 || message.length > 1200 || token.length < 10 || token.length > 2048) {
    return json({ ok: false, code: "validation", message: "Please check all required fields and complete verification." }, 400);
  }
  let checked;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: c.secret,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || undefined
      })
    });
    if (!response.ok) throw new Error("Turnstile network error");
    checked = await response.json();
  } catch {
    return json({ ok: false, code: "verification_unavailable", message: "Security verification is unavailable. Please try again or email us." }, 502);
  }
  if (!checked || checked.success !== true || !PROD_HOSTS.has(checked.hostname) ||
      (checked.action && checked.action !== "enquiry")) {
    return json({ ok: false, code: "verification_failed", message: "Security verification expired or failed. Please retry." }, 400);
  }
  const subject = "New AI automation enquiry | " + business.slice(0, 75);
  const text = [
    "New business AI automation enquiry",
    "",
    "Name: " + name,
    "Business: " + business,
    "Reply email: " + email,
    "Service: " + service,
    "",
    "Project description:",
    message,
    "",
    "Submitted from https://printerresolve.com/ai-automation",
    "Do not treat this enquiry as an agreed proposal or confirmed booking."
  ].join("\n");
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + c.key,
        "Content-Type": "application/json",
        "Idempotency-Key": "enquiry-" + crypto.randomUUID()
      },
      body: JSON.stringify({
        from: c.from,
        to: [c.to],
        reply_to: email,
        subject,
        text
      })
    });
    if (!result.ok) {
      console.error("Email provider rejected enquiry", result.status);
      return json({ ok: false, code: "delivery_error", message: "We could not send your enquiry. Please use the direct email option." }, 502);
    }
    const receipt = await result.json().catch(() => null);
    if (!receipt || !receipt.id) {
      console.error("Email provider gave no submission id");
      return json({ ok: false, code: "delivery_error", message: "We could not confirm your enquiry was submitted. Please contact us directly." }, 502);
    }
    return json({ ok: true, message: "Your enquiry was submitted. We will respond by email." });
  } catch {
    console.error("Email provider connection failed");
    return json({ ok: false, code: "delivery_error", message: "We could not send your enquiry. Please email us directly." }, 502);
  }
}
