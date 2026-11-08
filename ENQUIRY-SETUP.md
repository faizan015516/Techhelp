# Printer Resolve — direct business enquiry delivery

The AI automation page has a server-side contact form at
https://printerresolve.com/ai-automation.

It delivers leads to your official business mailbox after setup. Until then,
the page falls back transparently to a composed email and Copy enquiry button.
The page never says Sent unless an email service actually accepted the request.

## Delivery path

Visitor form → Cloudflare Pages Function (/api/send-enquiry) →
Cloudflare Turnstile verification → Resend transactional email →
support@printerresolve.com (Zoho mailbox).

Email contains the visitor's name, business name, email, selected service and
message, with the visitor's email in Reply-To.

The enquiry system is **independent of Razorpay**.

## 1. Configure Resend for outbound delivery only

- Open https://resend.com/domains and create/sign in to an account.
- Add notify.printerresolve.com as a sending domain.
- Add the DNS records required by Resend for this SENDING SUBDOMAIN only,
  in Cloudflare DNS, and verify it. Never overwrite existing Zoho MX, DKIM,
  or SPF records for the primary printerresolve.com domain.
- Generate a Resend API key restricted to sending permissions.
  Never paste this key in chat or GitHub.
- After verification, use the sender address
  Printer Resolve Enquiries <enquiries@notify.printerresolve.com>.
- Enquiries will arrive at support@printerresolve.com and will have the
  prospect's own email set as Reply-To.

If your official mailbox differs, update ENQUIRY_TO_EMAIL and the visible
email links on the site.

## 2. Configure Cloudflare Turnstile

- In Cloudflare Dashboard → Turnstile, create a Managed widget for
  printerresolve.com, also adding www.printerresolve.com if used.
- Copy its public site key and private secret key.
- Server-side validation checks the token against Cloudflare Siteverify,
  including the expected hostname and form action.

## 3. Configure production variables in Cloudflare Pages

Cloudflare → Workers & Pages → Printer Resolve → Settings →
Variables and Secrets → Production.

| Variable | Type | Value |
|---|---|---|
| RESEND_API_KEY | Secret | Your Resend API key |
| ENQUIRY_TO_EMAIL | Text | support@printerresolve.com |
| ENQUIRY_FROM_EMAIL | Text | Printer Resolve Enquiries <enquiries@notify.printerresolve.com> |
| TURNSTILE_SITE_KEY | Text | Public Turnstile site key |
| TURNSTILE_SECRET_KEY | Secret | Private Turnstile secret |

Save these values and deploy the latest GitHub main branch.
Cloudflare secrets must be configured before the deployment using them.

Do not publish Resend, Turnstile, or Razorpay secrets in browser code,
screenshots, chats, or the repository.

## 4. Verify that delivery really works

1. Visit https://printerresolve.com/api/send-enquiry.
   The configuration response should include available: true.
   This does not confirm actual email delivery.
2. Hard-refresh https://printerresolve.com/ai-automation.
   The button should say Send enquiry securely and a Turnstile check
   should appear (it may run automatically).
3. Fill the form with your own address and a non-sensitive test message.
4. Complete verification and submit.
5. Confirm the success message. Check the actual Zoho mailbox
   (including spam folder) AND the Resend Emails activity list.
   Verify Reply-To points to your test email address.
6. If the API reports unavailable, check all five Production variables
   and redeploy. If it reports an error, check Resend domain verification
   and Cloudflare Function logs before retrying.

The backend uses strict field validation, an invisible honeypot, a bot timing
check, origin restriction and mandatory server-validated Turnstile. For
higher volumes, also add Cloudflare rate-limiting protections.

## Privacy and operational scope

- No patient files, passwords, payment details or medical records.
- Messages are passed to Resend for delivery, and retained according
  to the Zoho mailbox settings. This site does not keep a separate
  database of enquiries.
- The privacy page explains this workflow.
- Resend acceptance does not guarantee delivery to the inbox.
- The Razorpay test payment backend is not changed by this work.
