# PrinterResolve — AdSense consent and privacy deployment gate

**Last reviewed:** 6 November 2026  
**Site:** https://printerresolve.com  
**Scope:** Google AdSense approval preparation, advertising disclosures, consent operations and truthful publisher identity. This is a working checklist, **not** a certification or legal opinion.

## Current evidence (from the repository)

| Item | Current finding | Verification status |
|---|---|---|
| Google AdSense site tag | The AdSense application script with publisher ID `pub-2393332073506347` is present on informational pages | Verified in source; actual ad service/approval is not inferred |
| `ads.txt` | Contains the matching Google publisher entry | Verified in repository; check production separately |
| `robots.txt` | Allows crawlers and references the canonical sitemap | Verified in repository |
| Privacy policy | Describes hosting, email, the AdSense application tag, Google advertising cookies, third-party vendors and opt-out links | Published; legal compliance cannot be certified from a document alone |
| Google-certified CMP / TCF signal | No account-level `Privacy & messaging` configuration was accessible to this audit | **NOT VERIFIED**; cannot be inferred solely from source code |
| Consent message in EEA, UK, Switzerland | Must be inspected in the AdSense account and tested from an eligible regulatory context | **NOT VERIFIED** |
| Independently credentialed editor/technician | No person or credential independently verified for publication | Do not invent names, qualifications or hands-on test records |
| AdSense review decision | A passing technical audit cannot establish approval | Do not request review automatically |

## One required account-side check

1. Sign in to the correct **Google AdSense** account for `printerresolve.com`.
2. Open **Privacy & messaging**.
3. Open **European regulations**. If no message is configured, choose **Create**; if one exists, use **Manage** and inspect it.
4. Make sure `printerresolve.com` is selected, the privacy-policy URL is correct, the languages/vendors/purposes are appropriate, and the Google-certified CMP / IAB TCF integration meets the requirements for the traffic and ad types you serve.
5. Publish the message only after confirming the settings. Inspect how visitors can **consent**, **not consent**, **manage options**, and **reopen/revoke preferences**.
6. Use Google's supported message preview/test feature and, where applicable, test actual behavior for the EEA, UK and Switzerland. Check that the correct message appears, that ads/measurement follow the chosen consent state, and that preferences can be revisited. Make a note of the exact test date and region.
7. Review applicable US state privacy messages and other regional laws as needed; keep the site's privacy disclosures aligned with real providers and settings.

**Do not add an unverified homemade cookie banner solely to pass an audit.** A banner without correct consent signals is not a substitute for the required implementation. The Google CMP can be configured through AdSense; that account setting cannot be created by GitHub alone.

## Google documentation checked

- https://support.google.com/adsense/answer/13554116 — certified CMP / TCF requirements
- https://support.google.com/adsense/answer/10960768 — creating a European regulations message
- https://support.google.com/adsense/answer/10961068 — European regulations messages and choices
- https://support.google.com/adsense/answer/1348695 — required advertising cookie disclosures
- https://support.google.com/adsense/answer/7299563 — unique content and visitor usability

## AdSense resubmission gate

Keep **HOLD** until:
- [x] Website has visible, truthful independent editorial attribution and corrections links.
- [x] Specific high-risk printer instructions checked against multiple current primary-source documents, with model limitations explicit.
- [x] Privacy policy distinguishes AdSense application code from approved ads and from a working CMP.
- [ ] Owner verifies and publishes any required Google-certified CMP message and confirms consent behavior.
- [ ] Owner chooses whether to publish an accurate individual editor/publisher identity, without fabricated qualifications.
- [ ] Independently validate remaining model-specific references and gather actual device test evidence when feasible.
- [ ] Verify current Google Search Console indexing and resolved canonical/redirect problems; account for stale reports.
- [ ] Confirm site design, privacy, source links, and content work in production after the final release.

**Important:** These are internal review criteria, not Google's published approval checklist. Google alone makes the AdSense decision.
