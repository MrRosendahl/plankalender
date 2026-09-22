# Changelog

All notable changes to FC Norrsken Bokningskalender are documented here.

## 0.9.20 — 2026-09-22

- Fixed the Manifest V3 match pattern for the web-accessible toolbar icon so the unpacked extension loads in Chrome and Edge.
- Kept script execution restricted to FC Norrsken calendar pages; the broader resource match only permits the packaged icon to be displayed on the same website.
- Confirmed successful unpacked installation and operation against the production calendar in developer mode.

## 0.9.19 — 2026-09-22

- Verified the Manifest V3 package, JavaScript syntax, icon dimensions, public URLs, permissions, and privacy behavior.
- Smoke-tested calendar rendering, filters, booking details, conflict status, and view switching against the production page.
- Escaped dynamic calendar text and restricted generated event links to same-origin HTTPS URLs.
- Expanded publishing documentation for Microsoft Edge Add-ons.
- Clarified store-specific graphic assets, certification instructions, privacy controls, and remaining manual release steps.

## 0.9.18 — 2026-09-22

- Added English source-code documentation.
- Added Chrome Web Store publication metadata.
- Added privacy, listing, review, and publishing documentation.
- Added an original red-and-white calendar icon in Chrome's standard extension sizes.

## 0.9.17

- Added game-format duration handling and enhanced booking and conflict presentation.
