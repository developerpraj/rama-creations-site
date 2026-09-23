// Contact form: verifies every field in the browser, then submits to a
// Google Sheet via a Google Apps Script Web App -- the standard no-backend
// way to collect form submissions from a static site (GitHub Pages has no
// server of its own to receive this).
//
// Setup (once the Google Sheet is shared):
//   1. Open the Sheet -> Extensions -> Apps Script.
//   2. Paste the doPost(e) handler documented in rama-creations-site/README.md
//      (appends e.parameter.name/email/message/receivedAt as a new row).
//   3. Deploy -> New deployment -> type "Web app" -> execute as "Me" ->
//      access "Anyone" -> Deploy. Copy the resulting /exec URL.
//   4. Paste that URL into CONFIG.endpoint below.
// Until CONFIG.endpoint is set, the form still fully validates but shows a
// clear "not connected yet" message instead of silently failing.
const CONFIG = {
  endpoint: "https://script.google.com/macros/s/AKfycbxhejiL95yADBufTYlTZujVv2tAXTXsxXjnGi57UfRsgCMqTP3c_7q24n_TxjmOykzu/exec",
};

function isPlaceholderEndpoint() {
  return !CONFIG.endpoint || CONFIG.endpoint.startsWith("REPLACE_WITH_");
}

// Deliberately simple, not RFC-5322-exhaustive: rejects obvious typos
// (missing @, missing domain dot) without rejecting real edge-case addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields) {
  const errors = {};

  const name = fields.name.trim();
  if (!name) {
    errors.name = "Please enter your name.";
  } else if (name.length < 2) {
    errors.name = "Name looks too short.";
  } else if (name.length > 120) {
    errors.name = "Name is too long.";
  }

  const email = fields.email.trim();
  if (!email) {
    errors.email = "Please enter your email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "That doesn't look like a valid email address.";
  }

  const message = fields.message.trim();
  if (!message) {
    errors.message = "Please enter a message.";
  } else if (message.length < 10) {
    errors.message = "Please add a little more detail (at least 10 characters).";
  } else if (message.length > 4000) {
    errors.message = "Message is too long (4000 characters max).";
  }

  return errors;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("form-status");
  const submitBtn = form.querySelector("button[type='submit']");

  function setFieldError(field, msg) {
    const input = form.elements[field];
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (input) input.classList.toggle("invalid", Boolean(msg));
    if (errorEl) errorEl.textContent = msg || "";
  }

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "form-note" + (kind ? ` status-${kind}` : "");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Honeypot: a hidden field real users never fill in. If it has a value,
    // silently treat as spam without telling the bot anything went wrong.
    if (form.elements.company && form.elements.company.value.trim()) {
      setStatus("Thanks for your message!", "success");
      form.reset();
      return;
    }

    const fields = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
    };

    const errors = validate(fields);
    ["name", "email", "message"].forEach((field) => setFieldError(field, errors[field]));

    if (Object.keys(errors).length > 0) {
      setStatus("Please fix the highlighted field(s) above.", "error");
      return;
    }

    if (isPlaceholderEndpoint()) {
      setStatus("This form isn't connected yet.", "error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending...", "sending");

    try {
      // Apps Script Web Apps don't return CORS headers Fetch can read, so
      // this uses no-cors and treats "the request didn't throw" as success --
      // Apps Script itself still validates/appends the row server-side.
      await fetch(CONFIG.endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          name: fields.name.trim(),
          email: fields.email.trim(),
          message: fields.message.trim(),
          receivedAt: new Date().toISOString(),
        }),
      });
      setStatus("Thanks! Your message has been sent -- we'll get back to you soon.", "success");
      form.reset();
      ["name", "email", "message"].forEach((field) => setFieldError(field, ""));
    } catch (err) {
      setStatus("Something went wrong sending that -- please try again or email hello@theramacreations.com directly.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Clear a field's error as soon as the visitor starts fixing it.
  ["name", "email", "message"].forEach((field) => {
    form.elements[field].addEventListener("input", () => setFieldError(field, ""));
  });
});
