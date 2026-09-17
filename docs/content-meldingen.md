# Afhandeling van meldingen over onrechtmatige content

De publieke ingang is `/melding-onrechtmatige-content`; `/legal/takedown` verwijst daarnaar door. Meldingen gaan per e-mail naar `PLATFORM_EMAILS.abuse`, bezwaren naar `PLATFORM_EMAILS.appeals` (standaard `abuse@FlexPagina.nl` en `appeals@FlexPagina.nl`). De pagina verstuurt zelf geen e-mail, slaat geen melding op en neemt geen moderatiebesluit.

## Vóór ingebruikname

- Verifieer dat beide mailboxen of aliassen bestaan, externe mail ontvangen en kunnen antwoorden. Controleer ook spam/quarantaine. Het bestaan van de adressen in de code bewijst geen aflevering.
- Wijs een behandelaar en vervanger aan, met toegang tot beide mailboxen en een werkwijze voor urgente meldingen. Ontvangstbevestiging, beoordeling, beslissing en bezwaar worden handmatig opgevolgd.
- Vul de bestaande bedrijfsplaceholders in de juridische templates in en laat de definitieve teksten beoordelen. Informeer bestaande klanten over wezenlijke wijzigingen volgens de voorwaarden.
- Test na deployment de publieke route zonder login, de oude route, footerlinks en e-maillinks. Voer met geautoriseerde testmail een volledige ontvangst-, antwoord- en bezwaarproef uit.

## Werkwijze per melding

1. Registreer een dossiernummer, ontvangstdatum, exacte URL's, toelichting en beschikbare contactgegevens in een afgeschermde dossierregistratie. Beperk toegang tot behandelaars. Bevestig ontvangst zonder onnodige vertraging als elektronische contactgegevens beschikbaar zijn.
2. Beoordeel direct ernst en urgentie. Bij een vermoeden van een strafbaar feit met gevaar voor leven of veiligheid: escaleer onmiddellijk naar de verantwoordelijke behandelaar en bevoegde autoriteiten overeenkomstig artikel 18 DSA. Download of verspreid geen strafbaar beeldmateriaal.
3. Controleer welke klant en content betrokken zijn en of FlexPagina de content host. Vraag alleen noodzakelijke ontbrekende informatie. Vereis geen auteursrechtregistratie, telefoonnummer, woonadres, handtekening of standaard identiteitsbewijs. De melder hoeft niet zelf rechthebbende te zijn. Voor de in artikel 16 lid 2 onder c bedoelde meldingen over seksueel misbruik van kinderen zijn naam en e-mailadres niet vereist.
4. Beoordeel inhoud en onderbouwing objectief; vraag de klant waar nodig om reactie of bewijs van gebruiksrechten. Een klacht alleen rechtvaardigt geen automatische verwijdering. Houd rekening met grondrechten en leg de wettelijke of contractuele grond vast.
5. Kies een evenredige maatregel. Richt die op de specifieke content; leg vast waarom eventueel een hele website of account moet worden beperkt. Noteer omvang, duur, betrokken publicaties/bestanden en moment van uitvoering. Controleer bij uitvoering ook rechtstreeks toegankelijke bestanden en caches. Laat ingrijpende acties door een bevoegde medewerker uitvoeren.
6. Informeer de klant uiterlijk wanneer een contentbeperking ingaat, als diens elektronische contactgegevens bekend zijn, behoudens wettelijke uitzonderingen. Motiveer feiten, grondslag, maatregel, omvang, duur, eventueel gebruik van automatisering en rechtsmiddelen. Deel de identiteit van de melder alleen als strikt noodzakelijk. Documenteer een toegepaste wettelijke uitzondering.
7. Informeer de melder zonder onnodige vertraging over het besluit, ook als geen maatregel volgt, inclusief eventueel gebruik van automatisering en mogelijkheden voor herbeoordeling/rechtsmiddelen. Bewaar een kopie van de communicatie.
8. Behandel een bezwaar van melder of klant zorgvuldig, betrek nieuwe informatie en laat waar mogelijk een andere medewerker meekijken. Communiceer de uitkomst en herstel een onjuiste beperking waar mogelijk.
9. Sluit het dossier met besluit, uitvoering en communicatie. Beoordeel welke gegevens nog nodig zijn voor geschillen of wettelijke verplichtingen en verwijder overige persoonsgegevens; bewaar dossiers niet onbeperkt.

## Berichtinhoud

Ontvangstbevestiging: dossiernummer, ontvangstdatum, betrokken URL's, eventuele ontbrekende informatie en uitleg dat nog geen besluit is genomen.

Besluit: dossiernummer, content, relevante feiten, wettelijke of contractuele grond met toelichting, genomen of afgewezen maatregel, ingangsdatum, reikwijdte en eventuele duur, eventueel gebruik van automatisering, bezwaaradres en beschikbare gerechtelijke of toepasselijke buitengerechtelijke mogelijkheden. De melder ontvangt geen onnodige account- of klantgegevens.

## Bronnen

- [Digital Services Act, met name artikelen 14, 16, 17 en 18](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=nl)
- [ACM: tussenhandeldiensten](https://www.acm.nl/nl/digitale-economie/online-diensten-aanbieden/tussenhandeldiensten)

Deze wijziging legt een meldkanaal en werkwijze vast; zij is geen bewijs van volledige DSA-naleving of van operationele mailboxbewaking.
