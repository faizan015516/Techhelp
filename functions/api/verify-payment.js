// Cloudflare Pages Function: verify Razorpay checkout response server-side.
// The browser cannot mark an order as paid. Test payments only.
const TEST_AMOUNT_PAISE = 10000;
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

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Cross-origin requests are not accepted." }, 403);
  if (!configured(env)) return json({ error: "Test verification is not configured." }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return json({ error: "Expected JSON request." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 2048) {
    return json({ error: "Request too large." }, 413);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = body || {};
  if (typeof orderId !== "string" || !/^order_[a-zA-Z0-9]{5,}$/.test(orderId) ||
      typeof paymentId !== "string" || !/^pay_[a-zA-Z0-9]{5,}$/.test(paymentId) ||
      typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
    return json({ error: "Missing or invalid Razorpay payment fields." }, 400);
  }

  // WebCrypto handles HMAC verification without embedding the key in frontend code.
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(signature.match(/.{2}/g), pair => parseInt(pair, 16));
    const valid = await crypto.subtle.verify(
      "HMAC", key, sigBytes, enc.encode(orderId + "|" + paymentId)
    );
    if (!valid) return json({ error: "Payment signature mismatch. Not marked as paid." }, 400);
  } catch {
    return json({ error: "Could not verify payment signature." }, 500);
  }

  // Signature authenticity alone does not prove capture or the correct amount.
  const auth = btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET);
  let response;
  try {
    response = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Basic " + auth, Accept: "application/json" }
    });
  } catch {
    return json({ error: "Unable to confirm payment with Razorpay. Please check the dashboard." }, 502);
  }
  if (response.status === 401 || response.status === 403) return json({ error: "Razorpay credentials rejected." }, 401);
  if (!response.ok) return json({ error: "Could not confirm payment status with Razorpay." }, 502);

  let payment;
  try { payment = await response.json(); } catch { return json({ error: "Unrecognized payment status response." }, 502); }
  if (payment?.id !== paymentId || payment.order_id !== orderId ||
      payment.amount !== TEST_AMOUNT_PAISE || payment.currency !== CURRENCY) {
    return json({ error: "Payment does not match the test order." }, 400);
  }
  if (payment.status !== "captured") {
    return json({ verified: false, status: payment.status || "pending", message: "Payment is not captured. Do not fulfil." }, 202);
  }

  // No database or order fulfilment: this confirms a test transaction only.
  return json({ verified: true, mode: "test", status: "captured", payment_id: paymentId,
    message: "Simulated test transaction verified; no real funds were collected." });
}
