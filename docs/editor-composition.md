# Meer ontwerpvrijheid in de editor

## Bediening

- **Formaat en ruimte** in de sectie-inspector: tekstuitlijning, inhoudsbreedte, titel- en tekstgrootte, ruimte boven/onder, afbeeldingsformaat/uitsnede/focus en bij ondersteunde indelingen een kolomverhouding van 50/50, 40/60 of 60/40. Afzonderlijke instellingen en alle opmaak kunnen worden hersteld. Navigatie en footer behouden hun eigen instellingen.
- **Eigen elementen**: titels, tekst, afbeeldingen, knoppen, iconen en scheidingslijnen toevoegen boven of onder de bestaande inhoud. Elementen kunnen worden verplaatst, gedupliceerd, verwijderd en afzonderlijk opgemaakt.
- **Vrije sectie** in de sectiekeuze: één, twee of drie kolommen met dezelfde elementen. Elementen kunnen ook rechtstreeks in een kolom op het canvas worden toegevoegd en via de instellingen naar een andere kolom worden verplaatst. Minder kolommen kiezen verplaatst bestaande elementen naar de overgebleven kolommen; er verdwijnt geen inhoud. Op smalle schermen staan de kolommen onder elkaar.
- Klik op bestaande tekst, een afbeelding of een knop voor directe bediening. Tekst blijft rechtstreeks bewerkbaar; de werkbalk biedt lettergrootte en uitlijning. Afbeeldingen kunnen worden vervangen, verkleind en bijgesneden met een focuspositie. Knoppen krijgen tekst, bestemming en stijl. De afbeeldingsvlakken/achtergrond van de introductiesectie bieden eveneens een afbeeldingskiezer en focuspositie. Direct bewerken blijft op mobiel op het canvas.

## Opslag en compatibiliteit

Er is geen schemamigratie nodig: de bestaande `website_sections.type` is tekst en `content`/`styles` zijn JSON. `freeform` is een nieuw geregistreerd sectietype. Andere secties behouden hun oorspronkelijke renderer en inhoud. De bestaande opslagwachtrij, undo/redo, paginakopieën, herstelpunten en publicatiesnapshots dragen de nieuwe velden mee.

Nieuwe inhoudsvelden zijn `presentation`, `elements`, `textStyles`, `imageStyles` en `buttonStyles`; vrije secties gebruiken ook `columns`. Elementen hebben stabiele ID's. De bestaande canvas-opslag vervangt een inhoudsdocument: `SectionRenderer` voegt daarom patches eerst samen met de volledige huidige inhoud. Alleen niet-lege tekst en afbeeldingsbeschrijvingen komen in vertaaloverlays; links, bronafbeeldingen, kolommen en opmaak blijven gedeeld. Publicatie controleert links ook binnen elementen.

Er zijn maximaal 40 losse elementen per sectie en maximaal drie kolommen. Elementen bevatten gewone tekst en bekende vormgevingsopties, geen uitvoerbare HTML. Afbeeldingsadressen en knopdoelen worden bij de publieke weergave begrensd tot ondersteunde URL-vormen. De beperkte externe JSON-import is met deze wijziging niet uitgebreid; vrije secties worden in de editor gemaakt.

## Controle

- `tests/section-composition.test.mjs`: behoud van inhoud bij kolomwijzigingen, volgorde, invoergrenzen, directe veldbewerking, vertalingen, publicatielinks en opslag/klantscheiding met de echte lokale databasefuncties in PGlite.
- `tests/section-composition-render.test.mjs`: echte React-componenten renderen voor editor en publieke weergave, inclusief kolommen, inhoudsvolgorde, tekst-/afbeeldingsopmaak en afwezigheid van editorbediening op de publieke site. Alleen de asynchrone componentlader en CSS-module-imports worden voor deze Node-rendertest aangepast.
- Een visuele browsercontrole en de ingelogde opslag/publicatieflow op de verbonden omgeving blijven afzonderlijk nodig. De lokale browser kon tijdens deze implementatie niet worden bereikt; er zijn geen klantwebsites aangepast of gepubliceerd.
