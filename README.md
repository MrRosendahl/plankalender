# FC Norrsken Plankalender

En lokal Chrome/Edge-extension som kompletterar FC Norrskens kalender med filter för anläggning och plan. Den ändrar inte webbplatsen för andra användare och skickar ingen information till någon extern tjänst.

## Funktioner i första versionen

- Körs bara på kalenderadressen när `ID=370929`.
- Läser kalendern i `#myForm`.
- Filtrerar bokningar för Norrvallen, Rosvalla, Hedvalla och Sjulevi.
- Visar en andra dropdown med de planer som hittats för vald anläggning.
- Döljer dagar utan träffar när ett filter används.

## Installera lokalt

1. Öppna `chrome://extensions` i Google Chrome (eller `edge://extensions` i Edge).
2. Aktivera **Utvecklarläge**.
3. Klicka på **Läs in okomprimerat tillägg**.
4. Välj den här mappen.
5. Öppna eller ladda om `https://www.fcnorrsken.se/kalender/?ID=370929`.

Efter kodändringar: klicka på omladdningsknappen för extensionen på extensionsidan och ladda sedan om kalenderfliken.

## Begränsning

Första versionen bygger på kalenderns nuvarande HTML-struktur. Om SportAdmin ändrar strukturen kan selektorerna behöva uppdateras.
