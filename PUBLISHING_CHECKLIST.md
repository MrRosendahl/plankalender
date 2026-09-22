# Chrome Web Store Publishing Checklist

## Developer account

- [ ] Register a Chrome Web Store developer account and pay the one-time registration fee.
- [ ] Enable two-step verification on the publisher account.
- [ ] Verify the publisher identity and contact email as requested by Google.
- [ ] Accept the current Chrome Web Store Developer Agreement and policies.

## Extension package

- [ ] Test the unpacked extension against the production calendar.
- [ ] Confirm `manifest.json` is valid Manifest V3 JSON.
- [ ] Confirm the version is higher than every previously uploaded version.
- [x] Add PNG extension icons and declare 16, 32, 48, and 128 pixel variants in `manifest.json`.
- [ ] Ensure the package contains no secrets, credentials, development artifacts, or unrelated files.
- [ ] Ensure all executable code is packaged locally and readable; do not use remotely hosted code.
- [ ] Create a ZIP whose root contains `manifest.json` rather than an enclosing project directory.

## Store listing

- [ ] Copy the product details from `STORE_LISTING.md`.
- [ ] Select Swedish as the primary language.
- [ ] Select the appropriate category and distribution setting.
- [ ] Upload `icons/icon128.png` as the 128 × 128 store icon.
- [ ] Upload at least one accurate 1280 × 800 screenshot.
- [ ] Upload a 440 × 280 small promotional tile if requested by the dashboard.
- [ ] Add only images that accurately represent the extension and do not expose private information.
- [ ] Add the homepage and support URLs.

## Privacy practices

- [ ] Publish `PRIVACY.md` at a stable, public HTTPS URL.
- [ ] Enter that URL in the dashboard's privacy-policy field.
- [ ] Copy and verify the answers in `PRIVACY_DISCLOSURES.md`.
- [ ] State the extension's narrow single purpose.
- [ ] Justify access to `https://www.fcnorrsken.se/kalender/*`.
- [ ] Declare that the extension does not use remote code.
- [ ] Accurately certify current data-use practices and limited use.

## Review and release

- [ ] Add the review steps from `TEST_INSTRUCTIONS.md` if the dashboard requests test instructions.
- [ ] Review the listing, privacy disclosures, manifest, and actual behavior for consistency.
- [ ] Choose manual or automatic publishing after review.
- [ ] Submit the item for review.
- [ ] Keep the uploaded ZIP and release source for future updates.

## Current blocker

The repository does not yet contain store screenshots. Capture at least one accurate 1280 × 800 image before submission. The included red-and-white icon is an original generic calendar design and does not reproduce the FC Norrsken or SportAdmin logo.
