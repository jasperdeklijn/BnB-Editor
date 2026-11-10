# Live UX-controle — website 4

Datum: 10 november 2026. Getest op flexpagina.nl met toestemming om ‘Mijn website 4’ te wijzigen. De eerdere acht verbeterpunten zijn opnieuw doorlopen met echte opgeslagen inhoud.

## Resultaten per punt

| Punt | Live resultaat |
| --- | --- |
| 1. Responsive preview | De gesplitste intro blijft op telefoon leesbaar en stapelt correct. Op de tabletgrens bestaat nog een verschil: het editorcanvas is 768 pixels breed en toont een rij met een titel van 48 pixels; de losse preview op een viewport van 768 pixels heeft door de klassieke scrollbar 753 pixels inhoudsbreedte en toont een kolom met een titel van 36 pixels. Hiervoor staat een aanvullende lokale correctie klaar. |
| 2. Veldlabels | Titel, Ondertitel en Knoptekst zijn via hun toegankelijke namen bedienbaar. Ondertitel is een echt tekstvak met gekoppeld label. Dit is geen volledige screenreaderaudit. |
| 3. Tekstbewerking | Titel, ondertitel met regeleinde en knoptekst zijn gewijzigd. De status ging van Opslaan naar Opgeslagen. Na herladen bleven de teksten en de gekozen indeling behouden. |
| 4. Lege kalender | Het raster blijft zichtbaar in maand-, week- en dagweergave. Een klik op 11 november opende het formulier voor 11 november 09:00–10:00. Het formulier is zonder opslaan gesloten. |
| 5. Eerste ingebruikname | De vereenvoudigde lege editor was live aanwezig. Basisopzet maken voegde vier secties toe, selecteerde de intro en maakte het bewerkpaneel beschikbaar. Een oude standaardverwijzing #contact werd in de keuzelijst nog als onbekend getoond; de eigenlijke websiteknop kon die verwijzing wel oplossen. In website 4 is de contactsectie opnieuw geselecteerd. De keuzelijst is lokaal gelijkgetrokken met de linkrenderer. |
| 6. Lege aanvragen | De lege inbox toont begeleiding voor de eerste aanvraag. Een zoekopdracht zonder resultaten toont een andere leegmelding met filterherstel. Filters wissen verwijderde de zoekparameter en herstelde de eerste-inboxweergave. De bronlabels zijn onderscheidend. |
| 7. FlexCheck en SEO | Eerst is uitsluitend Home-SEO opgeslagen: de melding over websitebrede standaarden bleef terecht staan. De herstelroute opende de lege websitebrede velden. Na invullen en opslaan werd het SEO-punt Gereed en ging het totaal van 5 naar 6. Daarnaast wees FlexCheck de daadwerkelijk werkende interne contactknop nog af; de lokale controlelogica is hiervoor aangepast. |
| 8. Terminologie | De sectiekeuze gebruikt onder meer Intro bovenaan, Diensten en Voettekst. De bedrijfspagina gebruikt je en de actuele uitleg over Planning. In de lege dienstensectie stonden nog Aanbod beheren/Aanbod aanmaken en FlexCheck sprak nog over footer. Deze restwoorden zijn lokaal gelijkgetrokken. |

## Aanvullende lokale correcties

1. De telefoon- en tabletweergave reserveert een stabiele scrollbar-gutter, zodat de klassieke scrollbar ook in de gesimuleerde inhoudsbreedte meetelt. Overlay-scrollbars reserveren daarbij geen extra ruimte. Deze correctie moet na deployment opnieuw met de live preview worden vergeleken. Zie ook de [CSS-documentatie over scrollbar-gutter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter).
2. De knopkeuze gebruikt dezelfde sectie-aliassen als de website zelf. Een bestaande #contact-link kan daardoor de juiste contactsectie tonen zonder de opgeslagen inhoud van andere websites te herschrijven.
3. FlexCheck herkent de pagina- en sectieverwijzingen die de editor opslaat. Verwijderde doelen, uitgesloten pagina’s, verkeerde combinaties van pagina en sectie, onveilige adressen en expliciet verborgen knoppen worden niet goedgekeurd. Een ingestelde privacypagina wordt ook herkend. De controle krijgt de reeds opgehaalde paginalijst mee; de bestaande eigenaarfilters blijven gelijk.
4. De lege dienstensectie en de toelichting bij de privacycontrole gebruiken Diensten en Voettekst.
5. FlexCheck filtert gearchiveerde diensten weg, zoals de editor dat al deed. Gearchiveerde diensten en hun afbeeldingen kunnen de controle daardoor niet meer ten onrechte positief maken.

De aanvullende codecorrecties zijn lokaal en niet gedeployd. De live waarnemingen in de tabel beschrijven de situatie vóór die aanvullende deployment.

## Achtergelaten testinhoud

‘Mijn website 4’ bevat nu vier basisblokken: intro, over ons, diensten en contact. De intro heet UX-testwebsite 4 en heeft een testondertitel met regeleinde, de knop Bekijk contact en de indeling Afbeelding rechts. De knop verwijst naar de contactsectie. Zowel Home-SEO als websitebrede SEO is met herkenbare testtekst ingevuld.

De website staat offline als concept. Er is niets gepubliceerd, geen testmail verzonden en geen afspraak of aanvraag aangemaakt. Bedrijfsgegevens en andere websites zijn niet gewijzigd.

## Controle van de aanvullende code

- De gerichte suite voor FlexCheck, de echte sectierenderer en de opslagwachtrij bevat 23 geslaagde tests. Daaronder vallen nieuwe regressies voor de oude contactalias, interne contactknoppen, ongeldige doelen en privacyverwijzingen.
- De FlexCheck-integratietest voert echte queries uit tegen de lokale PostgreSQL-testfixture, inclusief de interne contactverwijzing, de eigenaarscontrole en de uitsluiting van gearchiveerde diensten en hun afbeeldingen.
- De bestaande FlexStart-suite is afzonderlijk uitgevoerd: 3 tests geslaagd.
- ESLint is geslaagd voor alle gewijzigde code- en testbestanden. De volledige TypeScript-controle meldt nog 111 bestaande fouten in ongewijzigde bestanden; er zijn geen typefouten in de gewijzigde bestanden.
- De live browser registreerde tijdens de laatste controle geen consolefouten.
- Het opgemaakte testscherm en de telefoonpreview zijn als screenshots vastgelegd.

De eerste browserbeoordeling met voorbeeldgegevens is hiermee aangevuld met echte opslag, herladen en SEO-wijzigingen op website 4. De aanvullende lokale fixes vereisen nog een live controle na deployment. Formulierverzending en publiceren zijn niet getest.

Bij de controle viel ook op dat FlexCheck diensten en afbeeldingen als Gereed weergaf terwijl de dienstensectie leeg bleef en de intro een afbeeldingplaceholder toonde. In de broncode bleek de controle, anders dan de editor, gearchiveerde diensten mee te nemen. Deze afwijking is lokaal gecorrigeerd en met een databaseregressie gecontroleerd. Het specifieke live resultaat moet na deployment opnieuw worden beoordeeld; de checklist blijft geen volledige visuele goedkeuring.
