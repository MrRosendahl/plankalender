# FC Norrsken Bokningskalender

En lokal Chrome/Edge-extension som kompletterar FC Norrskens kalender med filter för anläggning och bokningsyta, exempelvis plan, sporthall eller konferensrum. Den ändrar inte webbplatsen för andra användare och skickar ingen information till någon extern tjänst.

## Funktioner

- Körs bara på kalenderadressen när `ID=370929`.
- Läser kalendern i `#myForm`.
- Filtrerar bokningar efter sektion, anläggning, bokningsyta och aktivitetstyp.
- Filtrerar bokningar för Norrvallen, Rosvalla, Hedvalla och Sjulevi samt aktiviteter utan angiven anläggning, exempelvis bortamatcher.
- Visar hela månaden som standard men låter användaren begränsa listan till en enskild vecka.
- Visar bokningarna i en tidsmatris per dag och anläggning, med tid lodrätt och bokningsytor som kolumner.
- Lägger till lite utrymme efter den sista bokningen när den når tidslinjens nederkant, så att sluttiden förblir läsbar. Kortare bokningar som redan ryms förstorar inte vyn i onödan.
- Visar den avancerade bokningskalendern som standard och låter användaren växla till SportAdmins originalkalender. Ett eget val sparas lokalt och används vid kommande besök.
- Visar SportAdmins ursprungliga val för sektion och aktivitetstyp endast i originalkalendern.
- Visar hela konstgräsplanen som ett sammanhängande block över dess delplaner.
- Normaliserar plannamnet `Konstgräs` till `Konstgräs Hela` i all visning och krockkontroll.
- Samlar överlappande bokningar i ett gemensamt krockblock där varje bokning alltid är synlig och valbar.
- Färgsätter varje post i krockblocket efter aktivitetstyp och visar tid samt plan direkt.
- Delar krockblocket i fyra virtuella plandelar: 1/4 A–D tar en del, Halvplan 1–2 tar två delar och Hela tar samtliga fyra.
- Placerar bokningar med samma start- och sluttid bredvid varandra när deras planområden inte överlappar.
- Staplar krockbokningar separat per visuell plankolumn: den första ligger överst, samtidiga bokningar i samma kolumn läggs under varandra och helplansbokningar läggs under delplanerna.
- Delar samtidiga bokningar med samma omfattning i sidställda spår i stället för att lägga dem ovanpå varandra.
- Öppnar fullständig boknings- och krockinformation när ett block klickas.
- Markerar krockande grupper och bokningar med rött.
- Visar vilken tid, vilket lag och vilken plan varje krockande bokning överlappar.
- Markerar att match har företräde som föreningens standard vid krock mellan match och träning, samt att träningen behöver samordnas.
- Jämför matcher, träningar och övriga bokningar med angivna start- och sluttider.
- Räknar en match utan sluttid enligt spelformens totala standardtid inklusive pauser: 3v3 20 minuter, 5v5 55 minuter, 7v7 70 minuter, 9v9 85 minuter, 11v11 för 15-årslag 95 minuter och 11v11 för 16+ 105 minuter.
- Väljer 11v11-tid utifrån lagets födelseår. Seniorlag och lag där åldern inte kan utläsas använder 16+-tiden.
- Låter användaren ändra standardtiden för varje spelform. Inställningarna sparas lokalt i webbläsaren.
- Markerar även de berörda raderna i den vanliga kalendern.

Krockkontrollen kräver samma datum och anläggning, överlappande tider och samma bokningsyta. En bokning av hela konstgräsplanen jämförs också med dess delplaner. Om kalendern anger en sluttid används den alltid i stället för den konfigurerade standardtiden.
Vid krock mellan match och träning visas matchen som prioriterad. Träningen markeras som att den behöver samordnas. Informationen är vägledande; lagen kan komma överens om annat.
Aktiviteter utan en känd anläggning visas och kan filtreras fram, men räknas inte som plankrockar.
Aktivitetstypen Övrigt ingår i krockkontrollen när aktiviteten har en angiven bokningsyta. Den kan då krocka med matcher, träningar och andra Övrigt-bokningar på samma yta när tiderna överlappar. Aktiviteter utan angiven bokningsyta undantas från krockkontrollen.

## Installera lokalt

1. Öppna `chrome://extensions` i Google Chrome (eller `edge://extensions` i Edge).
2. Aktivera **Utvecklarläge**.
3. Klicka på **Läs in okomprimerat tillägg**.
4. Välj den här mappen.
5. Öppna eller ladda om `https://www.fcnorrsken.se/kalender/?ID=370929`.

Efter kodändringar: klicka på omladdningsknappen för extensionen på extensionsidan och ladda sedan om kalenderfliken.

## Publicering i Chrome Web Store

Dokumentation för publicering finns i följande filer:

- `PRIVACY.md` – offentlig integritetspolicy på engelska.
- `STORE_LISTING.md` – färdig text och metadata för butikssidan.
- `PRIVACY_DISCLOSURES.md` – föreslagna svar för fliken Privacy practices.
- `TEST_INSTRUCTIONS.md` – instruktioner till Chrome Web Stores granskare.
- `PUBLISHING_CHECKLIST.md` – stegvis kontrollista inför publicering.
- `CHANGELOG.md` – versionshistorik.

En egen rödvit kalenderikon finns i `icons/` och är registrerad i manifestet. Innan publicering måste fortfarande skärmbilder av den faktiska extensionen tas. Se `PUBLISHING_CHECKLIST.md` för krav och återstående steg.

## Begränsning

Första versionen bygger på kalenderns nuvarande HTML-struktur. Om SportAdmin ändrar strukturen kan selektorerna behöva uppdateras.
