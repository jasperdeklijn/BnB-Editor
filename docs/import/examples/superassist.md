# Super Assist-demo voor FlexPagina

[superassist.json](superassist.json) is een importeerbaar FlexPagina v2-bestand: vijf pagina's, 22 bewerkbare secties en één unieke afbeelding. Het ontwerp is gebaseerd op de openbare Super Assist-website, gecontroleerd op 30 oktober 2026.

## Importeren

1. Open **Beheer → Demowebsites** (`/admin/demos`).
2. Upload `docs/import/examples/superassist.json`.
3. Gebruik bijvoorbeeld **Super Assist — Ruimte om te ondernemen** als naam en **demo-superassist** als subdomein.
4. Controleer desktop en mobiel en sla op als concept, of publiceer via de bestaande beheerfunctie.

Alleen bekijken kan via `/import-preview`. Een bewerkbaar klantontwerp maak je via **Import JSON** in de editor. Alle vijf pagina's staan in de publicatieselectie; een geïmporteerd klantontwerp begint ongepubliceerd. Deze demo is nog niet in een account opgeslagen of gepubliceerd.

## Inhoud en vormgeving

| Pagina | Inhoud |
| --- | --- |
| Home | Persoonlijke introductie, foto van Brenda, diensten en kennismaking |
| Diensten | Administratie, secretariaat, organisatie en praktische FAQ |
| Samenwerken | Structurele, flexibele, tijdelijke en projectmatige ondersteuning |
| Over Brenda | Achtergrond, ervaring en persoonlijke werkwijze |
| Contact | Officiële contactgegevens, FAQ en link naar het echte contactformulier |

Het ontwerp combineert turquoise accenten, donkerblauwgrijze tekst, zachte mint- en zandtinten, een gedeeld menu/footer, pagina-SEO, interne pagina- en sectielinks, uitklapbare FAQ's en subtiele boogjes, stippen en organische vormen. De bestaande portretfoto wordt hergebruikt. De teksten zijn herschreven voor het concept; tarieven, reviews, garanties en meetbare resultaten zijn niet verzonnen.

Alleen het bestaande importcontract wordt gebruikt. Het menu toont de merknaam als tekst; logo-upload, vrije iconenkeuze en werkende formulieren vallen buiten dit contract. Kenmerken krijgen standaardvinkjes. Een native aanvraagformulier kan later in de editor worden toegevoegd. De demo verstuurt zelf geen aanvragen. De externe contactknop verwijst naar de officiële website en is in het importvoorbeeld uitgeschakeld.

## Bronnen

- [Super Assist](https://superassist.nl/): positionering, huisstijl en bronafbeelding.
- [Diensten](https://superassist.nl/index.php/diensten/): werkzaamheden en samenwerkingsvormen.
- [Over Super Assist](https://superassist.nl/index.php/over-super-assist/): Brenda Willems, werkervaring en start in december 2022.
- [Contact](https://superassist.nl/index.php/contact/): info@superassist.nl en 06-14629060.
- [Portretfoto](https://superassist.nl/wp-content/uploads/2022/11/Profielfoto2022l-1.jpg).

De foto gaf HTTP 200 en is een decodeerbare JPEG van 640 × 642 pixels, 83.296 bytes. In beheerdemo's blijft de afbeelding naar de bronwebsite verwijzen; bij klantimport verwerkt de bestaande importer deze in de afbeeldingsbibliotheek.

## Verificatie

- De bestaande CLI accepteert het bestand als FlexPagina v2.
- Normalisatie en publieke demoprojectie behouden alle vijf pagina's en 22 secties. Alle 21 knop-/footerverwijzingen zijn gecontroleerd op geldige doelen.
- De bestaande importschema- en demotests slagen: 17 tests, nul fouten.
- In de echte lokale importpreview laden alle pagina's en de portretfoto.
- Alle vijf pagina's hebben op desktop 1168 px inhoud/viewport; mobiel 360 px inhoud/viewport binnen een 375 px iframe met scrollbar. Geen horizontale overflow.
- Hero naar Diensten, uitklapbare FAQ, footer naar de Contact-sectie en mobiel menu naar Over Brenda werken.
- Geen browserconsolefouten bij de laatste controle.
- [Desktopvoorbeeld](../../../artifacts/superassist-demo/desktop.png) en [mobiel voorbeeld](../../../artifacts/superassist-demo/mobile.png).

Deze controles omvatten lokaal importeren en weergeven. Opslaan in een account en live publicatie zijn niet uitgevoerd. De applicatiecode is niet gewijzigd.
