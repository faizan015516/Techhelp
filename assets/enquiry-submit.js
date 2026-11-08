/* AI Automation business enquiries — Formspree to existing Zoho inbox.
   The endpoint is the previously tested Formspree form for printerresolve.com.
   No email credentials or secrets are stored in the browser. */
(() => {
  "use strict";
  const form = document.getElementById("enquiry-form");
  const send = document.getElementById("send-enquiry");
  const status = document.getElementById("enquiry-status");
  if (!form || !send || !status) return;

  const originalLabel = "Send enquiry securely ↗";
  let busy = false;

  function message(text, state = "") {
    status.textContent = text;
    status.dataset.state = state;
  }
  function setBusy(active) {
    busy = active;
    send.disabled = active;
    send.setAttribute("aria-busy", String(active));
    form.setAttribute("aria-busy", String(active));
    send.textContent = active ? "Sending your enquiry…" : originalLabel;
  }
  send.textContent = originalLabel;
  message("", "");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const destination = form.action;
    // Restrict form destination to the expected Formspree endpoint.
    if (destination !== "https://formspree.io/f/xwlvrqkl") {
      message("The contact form is misconfigured. Please use support@printerresolve.com.", "error");
      return;
    }

    const data = new FormData(form);
    if (String(data.get("_gotcha") || "").trim()) {
      // Formspree also processes this honeypot. Do not forward bot traffic.
      message("Thank you for your enquiry.", "success");
      return;
    }
    setBusy(true);
    message("Sending your enquiry to our team…", "");

    try {
      const response = await fetch(destination, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      });
      if (!response.ok) {
        let detail = "";
        try {
          const result = await response.json();
          if (Array.isArray(result.errors) && result.errors.length) {
            detail = result.errors.map(x => String(x.message || "")).filter(Boolean).join(" ");
          }
        } catch { /* Provider may return HTML; show our safe fallback. */ }
        throw new Error(detail || "The enquiry was not accepted. Please try again or email support@printerresolve.com.");
      }
      form.reset();
      message("Thank you! Your enquiry was submitted. We will reply to the email address you provided.", "success");
    } catch (error) {
      message("We could not confirm your enquiry was sent. Your details are still here. " +
        (error && error.message ? error.message : "Please retry or use the email link."), "error");
    } finally {
      setBusy(false);
    }
  });
})();