# Chrome Web Store and Microsoft Edge Certification Instructions

## Preconditions

- No account, payment, or test credentials are required.
- Internet access to FC Norrsken's public calendar is required.
- Test with the latest stable version of Google Chrome or Microsoft Edge, according to the target store.

## Test page

Open:

https://www.fcnorrsken.se/kalender/?ID=370929

If the selected month contains no bookings, navigate to a month that contains calendar entries.

## Main test flow

1. Install the extension and open the test page.
2. Confirm that **Bokningskalender** appears below the calendar header.
3. Confirm that bookings appear in a vertical time matrix grouped by date and venue.
4. Change the section, period, venue, booking-area, and activity-type filters. Confirm that the matrix updates.
5. Select a booking block. Confirm that a modal displays its time, location, activity information, and a link to the original event when available.
6. Use **Visa kalender: Original** and confirm that the original SportAdmin calendar appears.
7. Select **Avancerad** and confirm that the enhanced view returns.
8. Expand **Matchtider**, change a duration, reload the page, and confirm that the setting is retained locally.
9. If overlapping reservations exist in the selected period, confirm that the conflict count and red conflict group are displayed and that every booking remains selectable.
10. Open the browser developer console and confirm that the extension produces no errors during the preceding flow.

## Scope checks

- Open another FC Norrsken calendar URL whose query string does not contain `ID=370929`. Confirm that the extension does not modify it.
- Confirm that no account sign-in, external service, or remote code is required.

## Expected data behavior

The extension reads calendar text already present on the test page and processes it locally. It stores only calendar-view and match-duration preferences in local storage. It does not transmit calendar or user data.

## Certification note

The extension is intentionally limited to one public FC Norrsken calendar. No login or special hardware is required. It is a Chromium Manifest V3 extension and uses the same package and behavior in Chrome and Edge.
