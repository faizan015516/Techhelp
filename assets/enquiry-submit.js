/* AI Automation enquiries: direct API delivery with transparent mailto fallback.
   The sender API key and Turnstile secret always remain on Cloudflare Pages. */
(() => {
  "use strict";
  const form = document.getElementById("enquiry-form");
  const send = document.getElementById("send-enquiry");
  const status = document.getElementById("enquiry-status");
  const widgetContainer = document.getElementById("enquiry-turnstile");
  const note = document.getElementById("enquiry-note");
  if (!form || !send || !status) return;

  const endpoint = "/api/send-enquiry";
  let directReady = false;
  let busy = false;
  let token = "";
  let widgetId = null;
  let startedAt = Date.now();

  function message(text, state = "") {
    status.textContent = text;
    status.dataset.state = state;
  }
  function setButton(text, disabled) {
    send.textContent = text;
    send.disabled = disabled;
    send.setAttribute("aria-busy", String(disabled && busy));
  }
  function manualFallback(info) {
    directReady = false;
    token = "";
    if (widgetContainer) widgetContainer.hidden = true;
    setButton("Compose enquiry email ↗", false);
    if (note) note.textContent = "The direct form is not configured yet. This option opens your email application; you must send the draft yourself. Never include patient data or credentials.";
    message(info || "Direct submissions are unavailable. You can compose an email or copy your enquiry.", "warning");
  }
  function emailDraft() {
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const business = String(data.get("business") || "").trim();
    const email = String(data.get("email") || "").trim();
    const service = String(data.get("service") || "").trim();
    const description = String(data.get("message") || "").trim();
    const subject = "AI automation enquiry - " + (business || name);
    const body = [
      "Hello Printer Resolve,",
      "",
      "I would like to discuss an AI automation project.",
      "",
      "Name: " + name,
      "Business: " + business,
      "Email: " + email,
      "Service: " + service,
      "",
      description,
      "",
      "Please reply with next steps."
    ].join("\n");
    message("Opening your email app. Your enquiry has NOT been sent yet; review and send the email there.", "warning");
    window.location.href = "mailto:support@printerresolve.com?subject=" +
      encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }
  function resetTurnstile() {
    token = "";
    if (window.turnstile && widgetId !== null) {
      try { window.turnstile.reset(widgetId); } catch { /* Widget may be unavailable. */ }
    }
  }
  function loadChallenge(siteKey) {
    if (!widgetContainer || !siteKey) {
      manualFallback("Email verification is not configured. Please use the direct email option.");
      return;
    }
    widgetContainer.hidden = false;
    widgetContainer.setAttribute("aria-label", "Security verification");
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      if (!window.turnstile) {
        manualFallback("Security verification could not load. Please use the email option.");
        return;
      }
      try {
        widgetId = window.turnstile.render(widgetContainer, {
          sitekey: siteKey,
          action: "enquiry",
          theme: "dark",
          callback: value => { token = value; },
          "expired-callback": () => {
            token = "";
            message("Verification expired. Please complete it again.", "warning");
          },
          "error-callback": () => {
            token = "";
            message("Security verification encountered a problem. Please retry or use email.", "warning");
          }
        });
        directReady = true;
        setButton("Send enquiry securely ↗", false);
        if (note) note.textContent = "Your message is sent securely to our business mailbox through an email provider. We do not publish your details. Do not include patient records or passwords. See our Privacy Policy.";
        message("Complete the fields and security check to send your enquiry directly.", "");
      } catch {
        manualFallback("Security verification could not start. Please use the email option.");
      }
    };
    script.onerror = () => manualFallback("Security verification did not load. Please use the email option.");
    document.head.appendChild(script);
  }
  async function init() {
    setButton("Checking secure enquiries…", true);
    try {
      const res = await fetch(endpoint, { method: "GET", credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      if (!data.available || typeof data.siteKey !== "string") {
        manualFallback("Direct enquiry delivery is awaiting setup. Use the email option for now.");
        return;
      }
      loadChallenge(data.siteKey);
    } catch {
      manualFallback("Direct enquiries are temporarily unavailable. Use the email option.");
    }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (!directReady) {
      emailDraft();
      return;
    }
    if (!token) {
      message("Please complete the security verification before sending.", "warning");
      return;
    }
    const data = new FormData(form);
    const enquiry = {
      name: String(data.get("name") || ""),
      business: String(data.get("business") || ""),
      email: String(data.get("email") || ""),
      service: String(data.get("service") || ""),
      message: String(data.get("message") || ""),
      company_website: String(data.get("company_website") || ""),
      startedAt,
      turnstileToken: token
    };
    busy = true;
    setButton("Submitting your enquiry…", true);
    message("Submitting securely. Please keep this page open.", "");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(enquiry)
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.ok !== true) {
        throw new Error(result.message || "Your message was not submitted. Please try again or use the email link.");
      }
      form.reset();
      startedAt = Date.now();
      resetTurnstile();
      message("Your enquiry was submitted to our email service successfully. We will respond using the email address provided.", "success");
    } catch (error) {
      resetTurnstile();
      message((error && error.message ? error.message : "Your enquiry could not be submitted.") + " Nothing has been confirmed as sent. You can use the direct email link or Copy enquiry.", "error");
    } finally {
      busy = false;
      setButton("Send enquiry securely ↗", false);
    }
  });
  init();
})();