# Chrome Web Store Privacy Disclosures

Use these answers in the **Privacy practices** tab of the Chrome Web Store Developer Dashboard. Re-check them against the code before every release.

## Single purpose

Improve FC Norrsken's SportAdmin calendar by presenting bookings in a filterable time matrix and identifying overlapping reservations for the same booking area.

## Permission justification

### Host access: `https://www.fcnorrsken.se/kalender/*`

Required to read the calendar already displayed on FC Norrsken's website and inject the enhanced calendar interface, filtering controls, and conflict indicators. The extension does not run on unrelated websites. Its content script performs an additional calendar-ID check and exits unless the URL contains `ID=370929`.

## Remote code

Select: **No, I am not using remote code.**

Justification: all executable JavaScript and CSS are included in the extension package. The extension does not download or execute remote scripts, WebAssembly, or dynamically evaluated code.

## Data usage

Based on version 0.9.18, the extension does not collect or transmit user data. Calendar content is read and transformed locally in the browser and is not sent to the developer or third parties.

Do not select data-collection categories unless the implementation changes before submission. Complete the required limited-use certifications accurately.

## Local preferences

The extension stores the selected calendar view and configured match-duration defaults in the website's local storage. These values are settings, remain on the user's device, and are not transmitted.

## Privacy policy

Public URL after this repository update is published:

https://github.com/MrRosendahl/plankalender/blob/master/PRIVACY.md

If the code later adds analytics, network requests, authentication, advertising, or any collection or transmission of data, update both the dashboard disclosures and `PRIVACY.md` before publishing that version.
