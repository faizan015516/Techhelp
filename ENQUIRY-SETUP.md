# AI automation enquiry form — Formspree + Zoho Mail

## Existing verified integration

The business enquiry form on https://printerresolve.com/ai-automation
now reuses the Formspree endpoint previously tested for Printer Resolve:

https://formspree.io/f/xwlvrqkl

On 15 October 2026, a Formspree test enquiry was confirmed in the existing
Zoho mailbox **support@printerresolve.com**. Reusing the form avoids
additional email providers, SMTP credentials, DNS changes, or Cloudflare
environment variables.

## How the form works

Visitor submits the AI automation form -> Formspree -> existing notification
recipient support@printerresolve.com (Zoho Mail).

Fields: name, business, email, interested service, and description.
The Formspree email notification should show these details. The visitor's
email is supplied as a named email field to support replying.

The frontend sends a POST using FormData and the Accept: application/json
header. While sending, it disables the submit button; it shows a success
message **only when Formspree accepts the request**. Errors preserve the
visitor's form fields. There is a visible direct mailto link and the
existing Copy enquiry fallback. Without JavaScript, the native HTML form
can also submit to Formspree.

A hidden _gotcha anti-spam field is included. Formspree may provide
additional spam controls in your dashboard.

## Confirm the recipient and test

1. Log in to https://formspree.io/forms and open the existing form.
2. In the form settings, confirm the **notification recipient**
   is support@printerresolve.com (your Zoho inbox).
3. Open https://printerresolve.com/ai-automation and hard refresh.
4. Submit one sample with your own email and the service
   Website AI assistant (never enter patient records).
5. Confirm a positive acknowledgement appears and the entry appears in
   Formspree submissions.
6. Confirm the message arrives at support@printerresolve.com in Zoho.
   Check spam if necessary.

The older October test confirmed the Formspree-to-Zoho path at the time,
but a new end-to-end test is required to confirm the current page.

## Privacy and operational scope

See https://printerresolve.com/privacy for Formspree data handling.
Do not submit patient records, payment card data, passwords, or
other sensitive personal information through this form.

The form is independent of Razorpay test payments. No live payment
credentials were changed.
