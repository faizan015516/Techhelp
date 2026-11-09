# Razorpay Standard Checkout — test integration

This repository is a static Cloudflare Pages project with serverless Pages Functions. **Do not commit API secrets**.

## What has been implemented
- `functions/api/create-order.js` — `GET` returns safe test availability; `POST` creates an order through the Razorpay Orders API.
- `functions/api/verify-payment.js` — verifies Razorpay HMAC-SHA256 signature on Cloudflare, then fetches the payment status from Razorpay and requires `captured`, a matching `order_id`, amount and currency.
- `assets/razorpay-test-checkout.js` — opens Standard Checkout, handles failure/cancel, and verifies the response on the server.
- `ai-automation.html` — shows the explicitly labelled **test-mode** checkout panel.

### Restrictions
- The server accepts **only `rzp_test_` keys**; a live key will not enable this test.
- Fixed simulated amount: **INR 100 / 10,000 paise**. This is not an actual service price or invoice.
- The server rejects arbitrary browser-side prices and malformed payment identifiers.
- The frontend loads Checkout on first click and never receives `RAZORPAY_KEY_SECRET`.
- The app does not fulfil services, store transactions, send receipts, or collect real money.
- Razorpay international acceptance must be activated separately. No live rollout is authorised by this integration.
- Before collecting live payments, implement an authenticated quote/order system, persistent order records, webhook verification, duplicate processing protection, refund policy and operational reconciliation. **Never switch to live keys just to bypass this test restriction.**

## Set up and deploy (Cloudflare Pages)
1. In Cloudflare dashboard open **Workers & Pages → your Pages project → Settings → Variables and Secrets**.
2. For the environment you are testing (Preview or Production), add `RAZORPAY_KEY_ID` and encrypted secret `RAZORPAY_KEY_SECRET`. Both must be *test* credentials. Do not paste them into GitHub.
3. Deploy/redeploy the Git-integrated Pages project after configuring secrets. The `functions` directory must be in the Pages repository root (not just the static build output).
4. Open `/ai-automation` on the matching Cloudflare deployment and find **Test checkout**.
5. Click **Try Razorpay test checkout** and follow Razorpay's test payment flow; no real funds are charged.
6. Verify the output and Razorpay Test Mode dashboard; the page reports success only for a validated and captured payment.
7. Test cancellation (close the modal), test failure, disconnected network and invalid signatures. A failed/mismatched signature must return HTTP 400 and never report paid.

## Local development (optional)
Install the Wrangler CLI in your own development environment (not required in the deployed static website). Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to a **gitignored** `.dev.vars` file, then run `npx wrangler pages dev .`. Visit the local `/ai-automation` page. Do not make a `.env` file inside GitHub.

## Manual smoke checks
- `GET /api/create-order` returns `available: true` on a deployment with valid test keys, otherwise `false`.
- `POST /api/create-order` accepts only JSON `{"purpose":"integration_test","amount":10000,"currency":"INR"}`, creates an order of INR 100, returns its `order_id`, amount and public test `key_id`.
- `POST /api/verify-payment` expects Razorpay's three checkout response fields. Missing fields and bad signatures return HTTP 400; only captured and matching payments return `verified: true`.
- Never log, display or share secret keys, and do not send test card/payment data in email.

## Merchant operations
The marketing page and free troubleshooting site are separate from a merchant invoice. For a customer-specific project, use a written proposal covering deliverables, milestone payment terms, and cancellation/refund policy. Use Razorpay Payment Links or invoicing through your approved merchant account only after international payments have been enabled and business terms are finalized.
