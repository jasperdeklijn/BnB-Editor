# RW Timmerwerken-demo voor FlexPagina

[rwtimmerwerken.json](rwtimmerwerken.json) is een importeerbaar FlexPagina v2-bestand met vijf pagina's, 24 bewerkbare secties en vijf unieke afbeeldingen. Het concept is gebaseerd op de openbare website van Rob Willems Timmerwerken, gecontroleerd op 30 oktober 2026.

## Importeren

1. Open **Beheer → Demowebsites** (`/admin/demos`).
2. Upload `docs/import/examples/rwtimmerwerken.json`.
3. Gebruik bijvoorbeeld **RW Timmerwerken — Vakwerk voor uw woning** als naam en **demo-rwtimmerwerken** als subdomein.
4. Controleer desktop en mobiel en sla op als concept, of publiceer via de bestaande beheerfunctie.

Voor alleen bekijken gebruikt u `/import-preview`. Een bewerkbaar klantontwerp maakt u via **Import JSON** in de editor. Alle pagina's zijn opgenomen in de publicatieselectie; een klantimport start ongepubliceerd. Deze demo is nog niet in een account opgeslagen of gepubliceerd.

## Professionele vormgeving

De vormgeving gebruikt diep donkerblauw, warme lichte achtergronden, Montserrat/Open Sans, kleine hoekafrondingen en rustige secties. De oorspronkelijke blauwe merkassociatie blijft herkenbaar. Grote projectfoto's en concrete projectbeschrijvingen krijgen de nadruk. Er zijn geen decoratieve patronen, verzonnen reviews, prestatiecijfers, prijzen of certificeringen toegevoegd.

De bronfoto's zijn ongeveer 540 pixels breed. De hero verdeelt beeld en tekst over twee kolommen; het portfolio gebruikt foto's naast projectteksten. Zo blijven de bestaande beelden bruikbaar zonder ze als achtergrond over het volledige desktopscherm uit te vergroten. Voor een definitieve website zijn grotere originele projectfoto's een nuttige vervolgstap.

| Pagina | Inhoud |
| --- | --- |
| Home | Introductie, drie werkgebieden, projectgalerij en contactactie |
| Diensten | Zes soorten werkzaamheden, maatwerkvoorbeeld en FAQ |
| Projecten | Pergola, tuinhuis met overkapping, aanbouw en schuifdeurkasten |
| Over Rob | Bedrijf sinds 1 juni 2008, achtergrond en bedrijfsbus |
| Contact | Officiële adres-, telefoon- en e-mailgegevens en praktische FAQ |

De demo heeft een gedeeld paginamenu en footer, pagina-SEO, interne pagina-/sectielinks, afwisselende beeld-tekstindelingen en uitklapbare FAQ's. De volledige bedrijfsnaam staat in de inhoud en footer; de compacte merknaam in het menu past ook op mobiel.

Het bestaande importcontract ondersteunt geen werkend contactformulier, klikbare telefoon-/maillinks, logo-upload of vrije iconenkeuze. Contactgegevens staan daarom als tekst in de demo. De externe contactknop opent de bestaande officiële informatiepagina; externe links zijn in de importpreview uitgeschakeld. Een native aanvraagformulier kan later in de editor worden toegevoegd. De demo verstuurt zelf geen aanvragen.

## Bronnen

- [Home](https://rwtimmerwerken.nl/): bedrijfsnaam en werkzaamheden.
- [Informatie](https://rwtimmerwerken.nl/info.html): startdatum, vestigingsadres, telefoon, e-mail en bedrijfsbus.
- [Projecten](https://rwtimmerwerken.nl/projecten.html): overzicht werkzaamheden.
- [Pergola](https://rwtimmerwerken.nl/project1.html): douglashout en hardstenen sokkels.
- [Tuinhuis met overkapping](https://rwtimmerwerken.nl/project3.html): tuinhuis, schutting en dakafwerking.
- [Aanbouw vergroten](https://rwtimmerwerken.nl/project13.html): uitbreiding met kozijnen en tuindeuren.
- [Schuifdeurkasten](https://rwtimmerwerken.nl/project15.html): kasten op maat en laminaatvloer.

Teksten zijn voor het concept herschreven. De verouderde vermelding van een 15-jarig bestaan is vervangen door de concrete startdatum uit de bron. De vijf gebruikte JPEG's geven HTTP 200 en zijn decodeerbaar, elk kleiner dan 75 kB. Bij beheerdemo's blijven de afbeeldingen verwijzen naar de bronwebsite; bij klantimport verwerkt de bestaande importer ze in de afbeeldingsbibliotheek.

## Verificatie

- De bestaande CLI accepteert het bestand als FlexPagina v2.
- Normalisatie en publieke demoprojectie behouden vijf pagina's en 24 secties; alle 22 knop-/footerverwijzingen hebben geldige doelen.
- De vijf afbeeldingen laden in de echte lokale importpreview.
- Alle pagina's zijn gecontroleerd op desktop (1168 px inhoud/viewport) en mobiel (360 px inhoud/viewport binnen een 375 px iframe met scrollbar), zonder horizontale overflow.
- Hero naar Projecten, footer naar de Contact-sectie, uitklapbare FAQ en mobiel menu naar Over Rob werken.
- Geen browserconsolefouten bij de laatste controle.
- [Desktopvoorbeeld](../../../artifacts/rwtimmerwerken-demo/desktop.png) en [mobiel voorbeeld](../../../artifacts/rwtimmerwerken-demo/mobile.png).
- De bestaande demowebsite-tests slagen (vier tests). De algemene demo-API- en importschema-testbestanden kunnen niet starten doordat de bestaande voorbeelden `bnb.json` en `studio.json` ontbreken. Ook `multipage.json` is in de werkboom verwijderd. Deze bestaande verwijderingen zijn niet door dit werk aangepast of hersteld.

Dit controleert het nieuwe importbestand en de lokale weergave. Accountopslag en live publicatie zijn niet uitgevoerd. Applicatiecode is niet gewijzigd.
