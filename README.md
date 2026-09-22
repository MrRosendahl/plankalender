# FC Norrsken Plankalender

En lokal Chrome/Edge-extension som kompletterar FC Norrskens kalender med filter för anläggning och plan. Den ändrar inte webbplatsen för andra användare och skickar ingen information till någon extern tjänst.

## Funktioner

- Körs bara på kalenderadressen när `ID=370929`.
- Läser kalendern i `#myForm`.
- Filtrerar bokningar för Norrvallen, Rosvalla, Hedvalla och Sjulevi samt aktiviteter utan angiven anläggning, exempelvis bortamatcher.
- Visar hela månaden som standard men låter användaren begränsa listan till en enskild vecka.
- Visar bokningarna i en tidsmatris per dag och anläggning, med tid lodrätt och planer som kolumner.
- Låter användaren växla mellan den avancerade plankalendern och SportAdmins originalkalender. Valet sparas lokalt.
- Visar hela konstgräsplanen i en egen kolumn så att samtidiga bokningar på delplanerna förblir synliga.
- Delar samtidiga bokningar på samma plan i sidställda spår i stället för att lägga dem ovanpå varandra.
- Öppnar fullständig boknings- och krockinformation när ett block klickas.
- Markerar krockande grupper och bokningar med rött.
- Visar vilken tid, vilket lag och vilken plan varje krockande bokning överlappar.
- Markerar att match har företräde som föreningens standard vid krock mellan match och träning, samt att träningen behöver samordnas.
- Jämför matcher, träningar och övriga bokningar med angivna start- och sluttider.
- Räknar som standard en match utan sluttid som två timmar.
- Låter användaren ändra standardtiden för 3v3, 5v5, 7v7, 9v9 och 11v11. Inställningarna sparas lokalt i webbläsaren.
- Markerar även de berörda raderna i den vanliga kalendern.

Krockkontrollen kräver samma datum och anläggning, överlappande tider och samma plan. En bokning av hela konstgräsplanen jämförs också med dess delplaner. Om kalendern anger en sluttid används den alltid i stället för den konfigurerade standardtiden.
Vid krock mellan match och träning visas matchen som prioriterad. Träningen markeras som att den behöver samordnas. Informationen är vägledande; lagen kan komma överens om annat.
Aktiviteter utan en känd anläggning visas och kan filtreras fram, men räknas inte som plankrockar.
Aktivitetstypen Övrigt krockar inte med matcher eller träningar. Två Övrigt-bokningar kan endast krocka när båda gäller konferensrummet på samma anläggning och deras tider överlappar. Övriga Övrigt-aktiviteter undantas från krockkontrollen.

## Installera lokalt

1. Öppna `chrome://extensions` i Google Chrome (eller `edge://extensions` i Edge).
2. Aktivera **Utvecklarläge**.
3. Klicka på **Läs in okomprimerat tillägg**.
4. Välj den här mappen.
5. Öppna eller ladda om `https://www.fcnorrsken.se/kalender/?ID=370929`.

Efter kodändringar: klicka på omladdningsknappen för extensionen på extensionsidan och ladda sedan om kalenderfliken.

## Begränsning

Första versionen bygger på kalenderns nuvarande HTML-struktur. Om SportAdmin ändrar strukturen kan selektorerna behöva uppdateras.
