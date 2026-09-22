# Chrome Web Store and Microsoft Edge Privacy Disclosures

Use these answers in Chrome Web Store's **Privacy practices** tab and Microsoft Edge Partner Center's **Privacy** page. Re-check them against the code before every release.

## Single purpose

Improve FC Norrsken's SportAdmin calendar by presenting bookings in a filterable time matrix and identifying overlapping reservations for the same booking area.

## Permission justification

### Host access: `https://www.fcnorrsken.se/kalender/*`

Required to read the calendar already displayed on FC Norrsken's website and inject the enhanced calendar interface, filtering controls, and conflict indicators. The extension does not run on unrelated websites. Its content script performs an additional calendar-ID check and exits unless the URL contains `ID=370929`.

## Remote code

Select: **No, I am not using remote code.**

Justification: all executable JavaScript and CSS are included in the extension package. The extension does not download or execute remote scripts, WebAssembly, or dynamically evaluated code.

## Data usage

Based on version 0.9.20, the extension accesses calendar content already displayed on the target page and transforms it locally in the browser. It does not collect or transmit that content or other user data to the developer or third parties.

Do not select data-collection categories unless the implementation changes before submission. Complete the required limited-use certifications accurately.

## Local preferences

The extension stores the selected calendar view and configured match-duration defaults in the website's local storage. These values are settings, remain on the user's device, and are not transmitted.

## Privacy policy

Verified public URL:

https://github.com/MrRosendahl/plankalender/blob/master/PRIVACY.md

The URL and support page were publicly reachable during verification on September 22, 2026.

If the code later adds analytics, network requests, authentication, advertising, or any collection or transmission of data, update both store disclosures and `PRIVACY.md` before publishing that version.
