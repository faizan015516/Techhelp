// Lightweight controls for the Printer Resolve AI automation landing page.
// Illustrative responses only: this is NOT connected to a patient database or AI API.
(() => {
  "use strict";

  const navButton = document.getElementById("menu-toggle");
  const nav = document.getElementById("nav-links");
  function closeNav() {
    if (!nav || !navButton) return;
    nav.classList.remove("is-open");
    navButton.setAttribute("aria-expanded", "false");
  }
  if (nav && navButton) {
    navButton.addEventListener("click", () => {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      navButton.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(anchor => {
      anchor.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeNav();
    });
  }

  const examples = {
    appointment: {
      patient: "Hi, can I request a dental appointment?",
      assistant: "Of course. What day and time would you prefer? I'll record your request for the reception team to confirm availability."
    },
    services: {
      patient: "What treatments does your clinic offer?",
      assistant: "I can share the clinic's approved service information. For medical advice or treatment recommendations, I'll direct you to the qualified clinical team."
    },
    afterhours: {
      patient: "Is anyone available outside opening hours?",
      assistant: "I can help with general information and collect an inquiry for the team. I'll make it clear that a reply is not immediate or guaranteed."
    }
  };
  const patient = document.getElementById("demo-patient");
  const assistant = document.getElementById("demo-assistant");
  const counter = document.getElementById("demo-position");
  const chips = [...document.querySelectorAll(".demo-chip")];
  function chooseExample(example) {
    const data = examples[example];
    if (!data || !patient || !assistant) return;
    patient.textContent = data.patient;
    assistant.textContent = data.assistant;
    const index = ["appointment", "services", "afterhours"].indexOf(example) + 1;
    if (counter) counter.textContent = String(index).padStart(2, "0") + " / 03";
    chips.forEach(chip => chip.setAttribute("aria-pressed", String(chip.dataset.example === example)));
  }
  chips.forEach(chip => {
    chip.addEventListener("click", () => chooseExample(chip.dataset.example));
  });
  chooseExample("appointment");

  const form = document.getElementById("enquiry-form");
  const status = document.getElementById("enquiry-status");
  const copyButton = document.getElementById("copy-enquiry");
  // Service-card CTAs are ordinary anchor links, with a helpful preselected topic.
  const serviceField = document.getElementById("enquiry-service");
  document.querySelectorAll(".feature-link[data-service]").forEach(link => {
    link.addEventListener("click", () => {
      if (!serviceField) return;
      const requested = link.dataset.service;
      if ([...serviceField.options].some(option => option.value === requested)) {
        serviceField.value = requested;
        if (status) status.textContent = "Selected: " + requested + ". Add your details below to send an enquiry.";
      }
    });
  });
  function notice(message) {
    if (status) status.textContent = message;
  }
  function clean(value, max = 500) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  }
  function getEnquiry() {
    if (!form || !form.reportValidity()) return null;
    const data = new FormData(form);
    const name = clean(data.get("name"), 100);
    const business = clean(data.get("business"), 120);
    const email = clean(data.get("email"), 200);
    const service = clean(data.get("service"), 120);
    const message = clean(data.get("message"), 1200);
    const subject = "AI automation enquiry - " + (business || name);
    const body = [
      "Hello Printer Resolve,",
      "",
      "I would like to discuss an AI automation project.",
      "",
      "Name: " + name,
      "Business: " + business,
      "Email: " + email,
      "Service area: " + service,
      "",
      "What we would like to improve:",
      message,
      "",
      "Please reply with the next steps and proposal process."
    ].join("\n");
    return { subject, body };
  }
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const enquiry = getEnquiry();
      if (!enquiry) { notice("Please complete the required details before copying."); return; }
      const fullText = "To: support@printerresolve.com\nSubject: " + enquiry.subject + "\n\n" + enquiry.body;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(fullText);
        } else {
          const temp = document.createElement("textarea");
          temp.value = fullText;
          temp.style.position = "fixed";
          temp.style.left = "-9999px";
          document.body.appendChild(temp);
          temp.select();
          const worked = document.execCommand("copy");
          temp.remove();
          if (!worked) throw new Error("Copy not available");
        }
        notice("Enquiry copied. Paste it into your email and send it to support@printerresolve.com.");
      } catch {
        notice("Your browser blocked automatic copying. Use the Email directly link or copy the fields manually.");
      }
    });
  }
})();