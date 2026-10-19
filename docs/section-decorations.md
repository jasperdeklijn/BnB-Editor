# Sectiedecoraties

Kies in de sectie-inspector onder **Indeling → Stijltype** voor **Verfvlekken** of **Patroon**. Onder de stijlkeuze verschijnen voorbeelden van de beschikbare varianten.

- Verfvlekken: verfspetters, penseelstreken, aquarel en organische vormen.
- Patronen: stippen en boogjes, stippen, raster, diagonale lijnen, golven en ruiten.
- Grootte: 50–200% van de standaardgrootte.
- Zichtbaarheid: 0–40%. De decoratie gebruikt de accentkleur van de sectie.
- **Herstel standaard** zet de vorm, grootte en zichtbaarheid terug.

De instellingen staan in de bestaande sectiedata en werken ook in de hero, navigatie en op de gepubliceerde website. Bestaande secties zonder deze instellingen behouden hun oorspronkelijke uiterlijk. Alle vormen zijn lokale SVG-bestanden; er is geen externe dienst of extra pakket nodig.

## JSON-import

De volgende optionele velden staan in `content`, naast `styleType`:

| Veld | Waarden |
| --- | --- |
| `decorationVariant` bij `paint` | `splatter`, `brush`, `watercolor`, `organic` |
| `decorationVariant` bij `pattern` | `arches`, `dots`, `grid`, `diagonal`, `waves`, `diamonds` |
| `decorationScale` | Getal van 50 tot en met 200; standaard 100 |
| `decorationOpacity` | Getal van 0 tot en met 40; standaard 16 bij verf, 12 bij patronen |

Onbekende varianten of varianten uit de andere stijlgroep vallen bij weergave terug op de eerste variant van de gekozen stijl. De import weigert onbekende namen en waarden buiten de toegestane grenzen.
