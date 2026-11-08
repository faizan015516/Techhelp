/* Razorpay Standard Checkout (test only).
   Secret is exclusively in Cloudflare Pages Functions. */
(() => {
  "use strict";
  const button = document.querySelector("#razorpay-test-button");
  const status = document.querySelector("#razorpay-test-status");
  if (!button || !status) return;

  let inProgress = false;
  function message(text, state = "neutral") {
    status.textContent = text;
    status.dataset.state = state;
  }
  function busy(value) {
    inProgress = value;
    button.disabled = value;
    button.setAttribute("aria-busy", String(value));
    button.textContent = value ? "Preparing secure checkout…" : "Try Razorpay test checkout";
  }
  async function api(url, options) {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
    let body;
    try { body = await response.json(); } catch { throw new Error("The payment service returned an unexpected response."); }
    if (!response.ok && response.status !== 202) throw new Error(body.error || "The payment service is unavailable.");
    return body;
  }
  let sdkPromise;
  function checkoutSdk() {
    if (window.Razorpay) return Promise.resolve();
    if (!sdkPromise) {
      sdkPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay Checkout failed to load."));
        script.onerror = () => reject(new Error("Could not load Razorpay. Check your connection or browser extensions."));
        document.head.appendChild(script);
      }).catch(err => { sdkPromise = undefined; throw err; });
    }
    return sdkPromise;
  }

  async function checkAvailability() {
    try {
      const config = await api("/api/create-order", { method: "GET" });
      if (!config.available || config.mode !== "test" || config.amount !== 10000 || config.currency !== "INR") {
        button.disabled = true;
        button.textContent = "Test checkout unavailable";
        message("Test checkout is not configured for this deployment. Check that both Razorpay test keys are set in Cloudflare's Production environment, then redeploy.");
        return;
      }
      button.disabled = false;
      button.textContent = "Try Razorpay test checkout";
      message("Test mode is ready. This simulated ₹100 transaction cannot charge real funds.");
    } catch {
      button.disabled = true;
      button.textContent = "Test checkout unavailable";
      message("Checkout is not available here. Please contact us for a written quote.");
    }
  }

  button.addEventListener("click", async () => {
    if (inProgress || button.disabled) return;
    busy(true);
    message("Creating a secure test order…");
    try {
      const order = await api("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "integration_test", amount: 10000, currency: "INR" })
      });
      if (order.mode !== "test" || !String(order.key_id).startsWith("rzp_test_") ||
          !String(order.order_id).startsWith("order_") ||
          order.amount !== 10000 || order.currency !== "INR") {
        throw new Error("Unexpected test order details. Checkout was not opened.");
      }
      await checkoutSdk();
      let completed = false;
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Printer Resolve",
        description: "INR 100 simulated integration test – no real charge",
        order_id: order.order_id,
        theme: { color: "#225e89" },
        handler: async response => {
          completed = true;
          message("Checking the payment signature and capture status with Razorpay…");
          try {
            const verification = await api("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            if (verification.verified && verification.mode === "test" && verification.status === "captured") {
              message("Test payment verified successfully. No real money was collected.", "success");
            } else {
              message("Test response received, but capture is pending. Check your Razorpay Test Mode dashboard.", "warning");
            }
          } catch (error) {
            message(error.message || "Payment verification failed. Nothing has been marked paid.", "error");
          } finally {
            busy(false);
          }
        },
        modal: {
          ondismiss: () => {
            if (!completed) {
              message("Checkout was closed. No payment was confirmed.", "neutral");
              busy(false);
            }
          }
        }
      });
      checkout.on("payment.failed", event => {
        completed = true;
        const reason = event?.error?.description || "The simulated payment was declined.";
        message("Test payment failed: " + String(reason).slice(0, 180), "error");
        busy(false);
      });
      message("Opening Razorpay secure test checkout…");
      checkout.open();
    } catch (error) {
      message(error?.message || "Could not start test checkout.", "error");
      busy(false);
    }
  });

  checkAvailability();
})();
