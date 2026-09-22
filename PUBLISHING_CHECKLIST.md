# Chrome Web Store and Microsoft Edge Add-ons Publishing Checklist

## Verification status — 2026-09-22

The source package has been statically verified for both Chromium stores:

- [x] `manifest.json` is valid JSON and declares Manifest V3, version `0.9.20`.
- [x] `content.js` passes JavaScript syntax validation.
- [x] VS Code reports no errors in `manifest.json`, `content.js`, or `styles.css`.
- [x] The extension requests no optional API permissions and limits its content script to `https://www.fcnorrsken.se/kalender/*`.
- [x] The script additionally exits unless the query string contains `ID=370929`.
- [x] No network APIs, analytics, advertising, dynamic code evaluation, or remotely hosted executable code were found.
- [x] Dynamic calendar text is escaped before HTML rendering, and event links are restricted to same-origin HTTPS URLs.
- [x] The declared PNG icons exist and have the correct dimensions: 16, 32, 48, and 128 pixels.
- [x] The homepage, support page, privacy policy, and production test page are publicly reachable.
- [x] The privacy disclosures match version `0.9.20`: calendar content is processed locally and only view and match-duration preferences are stored in site-local storage.
- [x] Chromium smoke test against the production page rendered 196 selectable bookings, five filters, view switching, a details dialog, and conflict status without page errors.
- [x] User-confirmed unpacked installation in Vivaldi 8.2.4133.68 (official 64-bit build) developer mode loads and works against the production calendar.
- [x] User-confirmed unpacked installation in Google Chrome 153.0.8010.53 (official 64-bit build) works against the production calendar.
- [x] User-confirmed unpacked installation in Microsoft Edge 153.0.4234.48 (official 64-bit build) works against the production calendar.

Static verification cannot replace interactive browser testing or the stores' own package validation.

## Developer account

- [ ] Register a Chrome Web Store developer account and pay the one-time registration fee.
- [ ] Enable two-step verification on the publisher account.
- [ ] Verify the publisher identity and contact email as requested by Google.
- [ ] Accept the current Chrome Web Store Developer Agreement and policies.

## Extension package

- [x] Test the unpacked extension against the production calendar.
- [x] Test the unpacked installation in current stable Google Chrome.
- [x] Test the unpacked installation in current stable Microsoft Edge.
- [x] Confirm `manifest.json` is valid Manifest V3 JSON.
- [ ] Confirm the version is higher than every previously uploaded version.
- [x] Add PNG extension icons and declare 16, 32, 48, and 128 pixel variants in `manifest.json`.
- [ ] Ensure the package contains no secrets, credentials, development artifacts, or unrelated files.
- [x] Ensure all executable code is packaged locally and readable; do not use remotely hosted code.
- [ ] Create a ZIP whose root contains `manifest.json` rather than an enclosing project directory.

Recommended ZIP contents: `manifest.json`, `content.js`, `styles.css`, and `icons/*.png`. Store documentation and `assets/icon.svg` are not required at runtime.

## Chrome Web Store listing

- [ ] Copy the product details from `STORE_LISTING.md`.
- [ ] Select Swedish as the primary language.
- [ ] Select the appropriate category and distribution setting.
- [ ] Upload `icons/icon128.png` as the 128 × 128 store icon.
- [ ] Upload at least one accurate 1280 × 800 screenshot.
- [ ] Upload a 440 × 280 small promotional tile.
- [ ] Add only images that accurately represent the extension and do not expose private information.
- [ ] Add the homepage and support URLs.

## Privacy practices

- [x] Publish `PRIVACY.md` at a stable, public HTTPS URL.
- [ ] Enter that URL in the dashboard's privacy-policy field.
- [x] Verify the answers in `PRIVACY_DISCLOSURES.md` against the source code.
- [ ] Copy the verified answers into each store dashboard.
- [ ] State the extension's narrow single purpose in each dashboard.
- [ ] Justify access to `https://www.fcnorrsken.se/kalender/*` in each dashboard.
- [ ] Declare in each dashboard that the extension does not use remote code.
- [ ] Accurately certify current data-use practices and limited use.

## Microsoft Edge Add-ons

- [ ] Register for the Microsoft Edge program in Partner Center.
- [ ] Upload the same root-level ZIP and resolve Partner Center validation findings.
- [ ] Select Swedish and paste the Edge-compatible listing text from `STORE_LISTING.md`.
- [ ] Upload an extension logo for the Swedish listing. `icons/icon128.png` meets the 128 × 128 minimum; 300 × 300 is recommended.
- [ ] Optionally upload up to six screenshots at 1280 × 800 or 640 × 480. Reuse the sanitized Chrome screenshot where appropriate.
- [ ] Select category, visibility (`Public` or `Hidden`), markets, and mature-content status.
- [ ] Complete Single Purpose, Permission justification, Remote code, Data usage, and Privacy policy fields using `PRIVACY_DISCLOSURES.md`.
- [ ] Paste `TEST_INSTRUCTIONS.md` into **Notes for certification**.
- [ ] If publishing independently, ensure the name and listing do not imply authorization by FC Norrsken or SportAdmin. If publishing on behalf of the club, retain evidence of authorization to use its name.
- [ ] Submit for certification.

## Review and release

- [ ] Add the review steps from `TEST_INSTRUCTIONS.md` if the dashboard requests test instructions.
- [ ] Review the listing, privacy disclosures, manifest, and actual behavior for consistency.
- [ ] Choose manual or automatic publishing after review.
- [ ] Submit the item for review.
- [ ] Keep the uploaded ZIP and release source for future updates.

## Current blocker

The repository does not contain store screenshots or a 440 × 280 Chrome promotional tile. Capture at least one accurate 1280 × 800 screenshot and create the Chrome tile before submission. Interactive testing in current stable Chrome and Edge, developer-account setup, dashboard declarations, ZIP upload validation, and submission also remain manual.

The included red-and-white icon is an original generic calendar design and does not reproduce the FC Norrsken or SportAdmin logo.
