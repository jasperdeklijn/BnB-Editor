# Backupstrategie voor flexpagina.nl

## Doel en reikwijdte

Deze strategie beschrijft de minimale MVP-aanpak voor het herstellen van flexpagina.nl na dataverlies, een foutieve wijziging of een storing bij een externe leverancier. De strategie geldt voor de Supabase-database, Supabase Storage, de broncode en de configuratie die nodig is om de applicatie opnieuw uit te rollen.

Een backup is pas bruikbaar wanneer herstel aantoonbaar is getest. Dit document bewijst daarom niet dat een backup actief of succesvol is; de verantwoordelijke controleert de uitvoering volgens het onderstaande schema.

## Wat wordt geback-upt

### Supabase-database

De database bevat onder andere accounts, bedrijven, websites, secties, diensten, aanvragen, agenda-items, abonnementen en auditlogs.

- Gebruik de automatische databasebackups van het gekozen Supabase-abonnement wanneer die beschikbaar zijn.
- Maak daarnaast minimaal dagelijks een logische database-export met een door Supabase ondersteunde PostgreSQL-tool of exportmethode.
- Versleutel exports en bewaar ze buiten hetzelfde Supabase-project.
- Neem schema, tabellen, functies, policies en relevante databaseconfiguratie mee.
- Controleer na iedere backup minimaal de datum, bestandsgrootte en foutstatus.
- Bewaar geen databasebackups in GitHub.

### Supabase Storage

Databasebackups bevatten niet automatisch alle daadwerkelijke bestanden uit Storage. Maak daarom een afzonderlijke kopie van alle gebruikte buckets en objecten.

- Kopieer klantuploads minimaal wekelijks naar versleutelde opslag bij een andere locatie of provider.
- Voer de kopie dagelijks uit zodra uploads bedrijfskritisch worden of wekelijks gegevensverlies niet acceptabel is.
- Bewaar bij de bestanden een manifest met bucket, objectpad, bestandsgrootte, checksum indien beschikbaar en backuptijdstip.
- Controleer of verwijderde objecten niet onmiddellijk ook uit alle backups verdwijnen.

### Broncode en databasewijzigingen

GitHub is de primaire code-backup.

- Push afgeronde wijzigingen naar de centrale GitHub-repository.
- Houd databasewijzigingen zowel in `supabase/migrations/` als in `supabase/init.sql` actueel wanneer ze voor beide herstelroutes nodig zijn.
- Gebruik branches en pull requests of gecontroleerde commits zodat wijzigingen herleidbaar zijn.
- Behandel een lokale werkmap of Vercel-deployment niet als zelfstandige backup.

### Configuratie en secrets

- Documenteer welke omgevingsvariabelen en externe koppelingen nodig zijn, maar sla secretwaarden nooit op in GitHub of dit document op.
- Bewaar productiegeheimen in de beveiligde instellingen van de gebruikte providers en in een afzonderlijke, versleutelde noodkopie met beperkte toegang.
- Controleer elk kwartaal of de configuratie-inventaris volledig is en of een bevoegde vervanger toegang kan krijgen tijdens een incident.

## Frequentie en bewaartermijnen

| Onderdeel | Minimale frequentie | MVP-bewaartermijn | Controle |
| --- | --- | --- | --- |
| Supabase-database | Dagelijks | 30 dagelijkse kopieën en 3 maandkopieën | Dagelijks op fouten; wekelijks steekproef |
| Supabase Storage | Wekelijks, dagelijks bij kritieke uploads | 4 weekkopieën en 3 maandkopieën | Na iedere run manifest en foutstatus |
| Broncode | Na iedere afgeronde wijziging | Volledige Git-geschiedenis | Controleren dat de centrale remote actueel is |
| Configuratie-inventaris | Bij iedere configuratiewijziging | Huidige versie plus wijzigingshistorie | Elk kwartaal |

Langere wettelijke of contractuele bewaartermijnen moeten afzonderlijk worden vastgesteld. Backups mogen persoonsgegevens niet onbeperkt bewaren en moeten binnen het geldende verwijderbeleid vallen.

## Verantwoordelijkheden

- **Service-eigenaar:** eindverantwoordelijk voor planning, budget, toegang en controle van backups.
- **Technisch beheerder:** bewaakt backuptaken, onderzoekt fouten en voert hersteltests uit.
- **Incidentcoördinator:** beslist tijdens dataverlies welke herstelactie wordt gestart en legt besluiten vast.
- **Vervanger:** heeft gecontroleerde noodtoegang en kan de procedure uitvoeren wanneer de primaire beheerder niet beschikbaar is.

Leg de namen en bereikbaarheid van deze personen vast in een afgeschermd intern register, niet in de publieke repository.

## Kwartaalhersteltest

Voer minimaal ieder kwartaal een hersteltest uit in een geïsoleerde testomgeving. Overschrijf nooit productie als onderdeel van een oefening.

1. Kies een recente databasebackup en een Storage-backup.
2. Leg het gekozen herstelpunt en het verwachte resultaat vast.
3. Herstel de database in een leeg testproject.
4. Herstel een representatieve selectie Storage-objecten en controleer het manifest.
5. Start de applicatie met testconfiguratie.
6. Controleer minimaal inloggen, een website laden, secties ophalen, uploads openen en gekoppelde bedrijfsgegevens.
7. Controleer dat gebruikers niet bij gegevens van andere gebruikers kunnen.
8. Noteer duur, fouten, ontbrekende data en benodigde handmatige stappen.
9. Los bevindingen op en herhaal mislukte onderdelen.
10. Registreer datum, uitvoerder, gebruikte backup en eindresultaat.

## Procedure bij dataverlies

1. Stop risicovolle writes of zet het getroffen onderdeel tijdelijk buiten gebruik wanneer verdere schade mogelijk is.
2. Start de procedure uit `docs/incident-response.md` en wijs een incidentcoördinator aan.
3. Bepaal welke gegevens, klanten en tijdsperiode zijn geraakt.
4. Bewaar logs en ander onderzoeksmateriaal voordat systemen worden gewijzigd.
5. Kies het laatste bekende goede herstelpunt en leg het verwachte gegevensverlies vast.
6. Herstel eerst in een geïsoleerde omgeving en valideer integriteit en toegangsregels.
7. Laat de service-eigenaar het productieherstel goedkeuren.
8. Herstel productie, controleer kernfunctionaliteit en monitor op nieuwe fouten.
9. Informeer getroffen klanten duidelijk over impact en herstel wanneer dat nodig is.
10. Schrijf een korte post-mortem en verbeter de backup- of herstelprocedure.

## Maandelijkse controlelijst

- [ ] Alle dagelijkse databasebackups zijn uitgevoerd of fouten zijn opgevolgd.
- [ ] De Storage-backup en het manifest zijn actueel.
- [ ] De GitHub-repository bevat de actuele productiecode en migraties.
- [ ] Backupopslag is versleuteld en alleen toegankelijk voor bevoegden.
- [ ] De datum van de laatste succesvolle hersteltest is bekend.
- [ ] De verantwoordelijke en vervanger hebben nog de juiste toegang.

