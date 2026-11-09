// Cloudflare Pages Function: Razorpay test orders only.
// No secret values or customer-supplied prices are stored in source.
const TEST_AMOUNT_PAISE = 10000; // INR 100 simulated; NOT a business price.
const CURRENCY = "INR";
const HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

function configured(env) {
  return typeof env?.RAZORPAY_KEY_ID === "string" &&
    env.RAZORPAY_KEY_ID.startsWith("rzp_test_") &&
    typeof env?.RAZORPAY_KEY_SECRET === "string" &&
    env.RAZORPAY_KEY_SECRET.length > 10;
}

function sameOrigin(request) {
  const supplied = request.headers.get("Origin");
  return !supplied || supplied === new URL(request.url).origin;
}

export async function onRequestGet({ env }) {
  return json({
    available: configured(env),
    mode: "test",
    amount: TEST_AMOUNT_PAISE,
    currency: CURRENCY,
    message: "Simulated test checkout only. Not a live invoice or service payment."
  });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Cross-origin checkout requests are not accepted." }, 403);
  if (!configured(env)) return json({ error: "Test checkout is not configured in this Cloudflare environment." }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return json({ error: "Expected JSON request." }, 415);
  }

  let body;
  try {
    if (Number(request.headers.get("content-length") || 0) > 2048) return json({ error: "Request too large." }, 413);
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }
  // Never trust an arbitrary amount supplied by the browser.
  if (!body || typeof body !== "object" || body.purpose !== "integration_test") {
    return json({ error: "Only the fixed-value integration test is enabled." }, 400);
  }
  if (body.amount !== undefined &&
      (!Number.isSafeInteger(body.amount) || body.amount < 100 || body.amount !== TEST_AMOUNT_PAISE)) {
    return json({ error: "Invalid test amount." }, 400);
  }
  if (body.currency !== undefined && body.currency !== CURRENCY) {
    return json({ error: "Unsupported currency." }, 400);
  }

  const receipt = "test_" + crypto.randomUUID().replaceAll("-", "").slice(0, 25);
  const auth = btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET);
  let response;
  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: TEST_AMOUNT_PAISE,
        currency: CURRENCY,
        receipt,
        notes: { purpose: "printerresolve_test_only" }
      })
    });
  } catch {
    return json({ error: "Could not contact the payment provider. Try again later." }, 502);
  }
  if (response.status === 401 || response.status === 403) {
    return json({ error: "Razorpay test credentials were rejected. Check the Cloudflare secrets." }, 401);
  }
  if (!response.ok) {
    return json({ error: "Razorpay could not create the test order." }, 502);
  }
  let order;
  try { order = await response.json(); } catch { return json({ error: "Invalid response from payment provider." }, 502); }
  if (!order?.id?.startsWith("order_") || order.amount !== TEST_AMOUNT_PAISE || order.currency !== CURRENCY) {
    return json({ error: "Order details could not be validated." }, 502);
  }
  return json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: env.RAZORPAY_KEY_ID,
    mode: "test"
  });
}
