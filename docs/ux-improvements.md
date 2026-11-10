# UX-verbeteringen — 10 november 2026

De acht punten uit de browseranalyse zijn in de lokale broncode verwerkt. De wijzigingen passen geen opgeslagen klantinhoud aan en wijzigen de publicatievoorwaarden niet.

## Uitwerking

| Punt | Wijziging |
| --- | --- |
| 1. Preview | Secties gebruiken containerbreakpoints op dezelfde breedtes als de eerdere viewportbreakpoints. Dit geldt voor tekst, ruimte en kolommen, de gedeelde layoutinstellingen, navigatie en voettekst. Telefoon en tablet hebben een canvas van respectievelijk 390 en 768 pixels; wanneer nodig kan het canvas horizontaal scrollen. Diensten heeft een eigen container rond de inhoud, buiten de vaste informatiepopup. |
| 2. Labels | Titel, Ondertitel en Knoptekst van de intro hebben gekoppelde labels met unieke React-ID's. De zichtbaarheid van de knop heeft ook een toegankelijke ingedrukte status. |
| 3. Tekst bewerken | Ondertitel is een tekstvak met meerdere regels dat met de inhoud kan meegroeien. De belangrijkste tekstvelden staan eerst; de optionele icoonkeuze staat achter een uitklapbare knopinstelling. |
| 4. Kalender | Een lege of uitgefilterde kalender houdt de maand-, week- of dagweergave zichtbaar. De leegmelding is compact en de eerstvolgende handeling past bij het zichtbare raster. Ook de tekst bij aankomende afspraken onderscheidt een nieuwe agenda van een filter zonder resultaat. |
| 5. Eerste website | De lege editor laat het ongebruikte bewerkpaneel weg. Extra beheeropties blijven beschikbaar onder Meer website-acties. De bibliotheek begint met de basis in paginavolgorde; aanvullende secties staan onder Meer secties. Een lege pagina met gedeelde onderdelen behoudt het bewerkpaneel. |
| 6. Aanvragen | Een eerste lege inbox geeft uitleg en links naar het websiteformulier en het ontvangstadres. Een lege zoekselectie biedt filterherstel. Filters hebben een expliciete toepasknop en de dubbel genoemde bron heeft een onderscheidende naam. Fouten en geselecteerde aanvragen blijven zichtbaar. |
| 7. FlexCheck | De SEO-controle heet Websitebrede SEO-standaarden en licht toe dat pagina-SEO dit kan overschrijven en in dit controlepunt niet wordt beoordeeld. De herstelroute blijft naar de websitebrede instellingen leiden. |
| 8. Teksten | Sectienamen in de sectiekeuze en het bewerkpaneel komen uit het centrale register. Intro bovenaan, Over ons, Diensten en Voettekst worden consequent gebruikt. De aangepaste beheerflows gebruiken je en canvas. De verouderde tekst over een toekomstige boekingsmodule is vervangen door uitleg over Planning en diensten. |

## Controle

De lokale browsercontrole gebruikte de echte componenten met vaste voorbeeldgegevens, zonder klantgegevens te wijzigen of serveracties voor opslaan of verzenden uit te voeren. De tijdelijke controlepagina is na afloop verwijderd.

- Op 390 pixels tonen de editor en de losse render dezelfde kolomrichting en titelgrootte: onder elkaar en 30 pixels bij de gebruikte standaardintro.
- Op 768 pixels tonen beide een rij met een titelgrootte van 48 pixels bij dezelfde intro.
- Het tekstvak is via de naam Ondertitel bedienbaar. Een tekst met meerdere regels verschijnt direct op het canvas.
- De basisbibliotheek, het vereenvoudigde startscherm en het menu met extra acties zijn gecontroleerd.
- De lege inbox en een lege zoekselectie tonen de bedoelde verschillende vervolgstappen.
- Vanuit een lege maandkalender opent klikken op een dag het formulier met de gekozen datum. Het formulier is gesloten zonder op te slaan.
- Tijdens deze controles zijn geen browserconsolefouten geregistreerd.
- De gerichte regressiesuite is geslaagd: 48 tests. De rendercontrole bevat een extra test voor unieke veld-ID's, gekoppelde labels bij twee tegelijk gerenderde intro-editors en het tekstvak.
- ESLint op de gewijzigde TypeScript-bestanden en `git diff --check` zijn geslaagd.

Voor een gerichte herhaling:

```sh
node --test tests/calendar-ux-current.test.mjs tests/section-composition.test.mjs tests/section-composition-render.test.mjs tests/editor-inspector-navigation.test.mjs tests/flexcheck-schema.test.mjs tests/onboarding.test.mjs tests/inquiries.test.mjs tests/repeating-section-editors.test.mjs tests/section-decorations.test.mjs
```

De productiecode compileert met Webpack. De daaropvolgende TypeScript-stap en de afzonderlijke typecontrole melden 111 fouten in ongewijzigde import- en demomodules, en geen fouten in de gewijzigde bestanden. De aanwezige installatie bevat Next.js 16.3.8 en Zod 3.25.76, terwijl het projectbestand respectievelijk 16.4.5 en 4.6.7 voorschrijft. De afhankelijkheden en het lockbestand zijn niet aangepast voor deze UX-wijzigingen. Een volledige productiecontrole moet daarom met de voorgeschreven installatie worden herhaald. Turbopack liep in deze omgeving vast bij het starten van een CSS-worker; daarom is de productiecompilatie met Webpack gecontroleerd.

Een volledige WCAG-audit, alle mogelijke sectievarianten, verzending van formulieren, gegevensopslag en publicatie vallen buiten de uitgevoerde browsercontrole. De wijzigingen zijn niet gedeployd.
