# Plan: rechterzijbalk vereenvoudigen

## Doel

Maak de rechterzijbalk taakgericht en rustig. Een gebruiker moet steeds zien:

1. wat er wordt bewerkt;
2. welke hoofdactie nu beschikbaar is;
3. hoe die met maximaal één stap naar website-instellingen of een andere sectie gaat.

De huidige geneste tabstructuur wordt niet uitgebreid. Dit document is alleen een plan; de zijbalkwijzigingen zijn nog niet geïmplementeerd.

## Voorgestelde structuur

### 1. Eén contextgestuurde inspector

- Verwijder de vaste tabbladen `Sectie` en `Site` bovenaan de desktopzijbalk.
- Toon bij een geselecteerde sectie direct de sectie-inspector.
- Toon zonder selectie een compact overzicht met:
  - `Sectie kiezen`;
  - `Website-ontwerp`;
  - `Template toepassen`.
- Plaats in de vaste kop een duidelijke context, bijvoorbeeld `Sectie · Diensten`, plus één knop `Website-instellingen`.
- Gebruik in website-instellingen een terugknop `Terug naar Diensten` in plaats van een tweede tabniveau.

### 2. Sectie-instellingen groeperen zonder tabbladen

- Deel de lange sectie-editor op in uitklapbare groepen:
  - `Inhoud`;
  - `Indeling`;
  - `Kleuren`;
  - `Overgang en geavanceerd`.
- Open `Inhoud` standaard en onthoud per sessie welke groep de gebruiker het laatst gebruikte.
- Toon een korte samenvatting in een gesloten groep, bijvoorbeeld `Website-thema` of `Service grid`.
- Houd verwijderen als losse actie in de vaste kop; verstop deze niet tussen instellingen.

### 3. Website-instellingen als menu met detailpaneel

- Vervang de tabs en keuzelijsten in het sitepaneel door een korte menulijst:
  - `Thema en kleuren`;
  - `Lettertypen en ruimte`;
  - `Templates`;
  - `Taalweergave`.
- Een keuze opent één detailpaneel met een terugknop; er staan nooit twee tabniveaus tegelijk in beeld.
- Toon de huidige keuze als samenvatting in de menulijst, bijvoorbeeld `Bosgroen · Inter · Comfortabel`.
- Houd opslaan automatisch en gebruik alleen de bestaande status in de editorheader.

### 4. Desktop en mobiel gelijk trekken

- Gebruik dezelfde groepen en labels op desktop en mobiel.
- Behoud de mobiele ondernavigatie voor de hoofdgebieden, maar toon binnen `Stijl` dezelfde contextgestuurde inspector.
- Maak de inhoud intern scrollbaar met een vaste kop en vaste primaire actie.
- Controleer minimaal 320, 360, 768 en 1280 pixels breed.

## Implementatievolgorde

- [ ] Inventariseer alle huidige controls uit `EditorInspector`, `SelectionEditor`, `SiteDesignPanel` en `ThemePanel` en wijs elk control aan precies één nieuwe groep toe.
- [ ] Voeg een kleine inspector-router/state-machine toe met `section`, `site-menu` en `site-detail` als toestanden.
- [ ] Bouw de vaste contextkop met terugnavigatie en toegankelijke labels.
- [ ] Verplaats sectiecontrols naar uitklapbare groepen zonder save- of entitlementlogica te wijzigen.
- [ ] Zet het sitepaneel om naar menu plus detailpanelen en verwijder de geneste tabs.
- [ ] Synchroniseer desktop- en mobiele labels, scrollgedrag en terugnavigatie.
- [ ] Voeg regressietests toe voor selectiebehoud, terugnavigatie en automatisch opslaan.
- [ ] Voer TypeScript, ESLint en browsercontroles uit op desktop en de genoemde mobiele breedtes.

## Acceptatiecriteria

- Er is maximaal één navigatieniveau tegelijk zichtbaar in de rechterzijbalk.
- De desktopzijbalk bevat geen horizontale tabrij meer.
- De geselecteerde sectie en geopende groep blijven behouden na wisselen naar website-instellingen en terug.
- Alle bestaande sectie-, thema-, template- en taalcontrols blijven bereikbaar.
- Automatisch opslaan, abonnementlabels en foutmeldingen blijven functioneel gelijk.
- De vaste kop en inhoud overlappen niet en de volledige inhoud is bereikbaar met toetsenbord en touch.
