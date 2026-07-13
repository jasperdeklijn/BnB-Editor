# Incident response voor flexpagina.nl

## Doel

Dit document beschrijft de praktische MVP-procedure voor storingen, dataverlies, beveiligingsincidenten en uitval van externe diensten. Het doel is schade beperken, de dienst gecontroleerd herstellen en klanten tijdig begrijpelijke informatie geven.

## Wanneer deze procedure starten

Start een incident wanneer één of meer van deze situaties optreden:

- klanten kunnen niet inloggen, websites bewerken of publiceren;
- gepubliceerde websites zijn onbereikbaar of tonen verkeerde gegevens;
- aanvragen, e-mail, betalingen, database, opslag, DNS of SSL werken niet goed;
- gegevens zijn verwijderd, beschadigd of mogelijk ingezien door onbevoegden;
- een externe leverancier meldt een storing die de dienst raakt;
- monitoring, supportmeldingen of logs wijzen op brede of terugkerende fouten.

## Ernst bepalen

| Niveau | Voorbeeld | Eerste reactie |
| --- | --- | --- |
| SEV-1 kritiek | Brede uitval, mogelijk datalek of ernstig dataverlies | Direct starten, wijzigingen pauzeren en klanten snel informeren |
| SEV-2 hoog | Belangrijke functie voor meerdere klanten defect | Zo snel mogelijk onderzoeken en status communiceren |
| SEV-3 beperkt | Beperkte impact of werkbare workaround | Inplannen, volgen en betrokken klanten informeren indien nodig |

Bij twijfel wordt voorlopig het hogere niveau gekozen totdat de impact duidelijk is.

## Rollen

- **Incidentcoördinator:** houdt overzicht, bepaalt prioriteiten en geeft communicatie vrij.
- **Technisch verantwoordelijke:** onderzoekt de oorzaak, voert herstel uit en valideert de oplossing.
- **Communicatieverantwoordelijke:** werkt statuspagina en klantberichten bij.
- **Notulist:** legt tijdlijn, besluiten, wijzigingen en bewijs vast. Bij een klein incident kan de incidentcoördinator deze rol combineren.

Leg persoonlijke contactgegevens en provider-noodnummers vast in een afgeschermd intern register.

## Stappenplan

### 1. Incident herkennen

- Noteer starttijd, melder, symptomen en geraakte klanten of functies.
- Maak een intern incidentdossier, bijvoorbeeld `YYYY-MM-DD-korte-omschrijving`.
- Wijs een incidentcoördinator en voorlopig ernstniveau toe.
- Pauzeer niet-noodzakelijke deployments bij SEV-1 of SEV-2.

### 2. Intern of extern controleren

- Controleer recente deployments, configuratiewijzigingen, databasewijzigingen en logs.
- Controleer de statuspagina's van Vercel, Supabase, Stripe, mailprovider, domeinprovider en andere relevante leveranciers.
- Bepaal of het probleem applicatiebreed, accountgebonden, regiogebonden of providergebonden is.
- Bewaar relevante logs en tijdstippen. Deel geen secrets of persoonsgegevens in openbare kanalen.

### 3. Statuspagina bijwerken

- Werk bij klantimpact de route `/status` bij met getroffen services, actuele status en tijdstip van de laatste update.
- De huidige statuspagina is statisch in `app/status/page.tsx`; een wijziging vereist een gecontroleerde deployment.
- Publiceer alleen bevestigde feiten. Benoem onzekerheden expliciet en vermijd een hersteltijd te beloven zolang die niet betrouwbaar is.

### 4. Klanten informeren

- Gebruik de onderstaande storingstemplate voor getroffen klanten.
- Vermeld wat niet werkt, wat klanten eventueel zelf kunnen doen en wanneer de volgende update volgt.
- Deel geen technische details die beveiliging kunnen verzwakken en geen gegevens van andere klanten.
- Geef bij een actief incident regelmatig een korte update, ook wanneer er nog geen oplossing is.

### 5. Workaround of herstel uitvoeren

- Kies eerst de veiligste omkeerbare maatregel, zoals een problematische deployment terugdraaien, een functie tijdelijk uitschakelen of verkeer omleiden.
- Volg bij dataverlies `docs/backup-strategy.md` en test herstel eerst geïsoleerd.
- Leg iedere productiehandeling vast met tijdstip, uitvoerder en resultaat.
- Vraag bij SEV-1 waar mogelijk een tweede persoon om de herstelstap te controleren.

### 6. Herstel controleren

Controleer minimaal:

- inloggen en sessiebeheer;
- editor laden en wijzigingen opslaan;
- website publiceren en een gepubliceerde website openen;
- database- en Storage-toegang;
- contact- of aanvraagformulier en e-mailafhandeling;
- domein, DNS en SSL wanneer die geraakt waren;
- logs en foutpercentages na het herstel.

Controleer zowel een normale situatie als het eerder mislukte scenario. Monitor na herstel extra op terugval.

### 7. Incident afsluiten

- Laat de incidentcoördinator bevestigen dat de dienst stabiel is.
- Werk de statuspagina bij en verstuur de herstelmelding.
- Noteer eindtijd, duur, impact, gegevensverlies en resterende acties.
- Verwijder tijdelijke workarounds pas via een gecontroleerde wijziging.

### 8. Korte post-mortem schrijven

Maak bij SEV-1 en SEV-2, en bij terugkerende SEV-3-incidenten, binnen redelijke termijn een korte evaluatie met:

- samenvatting en klantimpact;
- tijdlijn van detectie tot herstel;
- directe en achterliggende oorzaak;
- wat goed en minder goed werkte;
- concrete verbeteracties met eigenaar en streefdatum;
- benodigde wijzigingen in monitoring, tests, backups of documentatie.

De evaluatie is bedoeld om herhaling te voorkomen en niet om personen de schuld te geven.

## Bij mogelijk beveiligings- of privacyincident

- Beperk toegang en verdere blootstelling zonder belangrijk onderzoeksmateriaal te wissen.
- Roteer betrokken secrets wanneer daar aanleiding voor is.
- Leg vast welke gegevens mogelijk geraakt zijn, van wie en gedurende welke periode.
- Laat tijdig beoordelen of melding aan betrokkenen, toezichthouders, verzekeraar of andere partijen nodig is.
- Deel details alleen met personen die ze voor onderzoek of besluitvorming nodig hebben.

## Communicatietemplates

### Klantmelding storing

```txt
We ervaren momenteel een storing in onze dienst. De oorzaak lijkt te liggen bij [provider/interne service]. We onderzoeken dit en plaatsen updates op onze statuspagina.

Getroffen onderdeel: [onderdeel]
Bekende impact: [impact]
Tijdstip volgende update: [tijdstip]
Eventuele workaround: [workaround of "nog niet beschikbaar"]
```

### Tussentijdse update

```txt
We onderzoeken de storing nog. [Korte bevestigde stand van zaken]. De impact is momenteel [impact]. We plaatsen uiterlijk om [tijdstip] een nieuwe update, of eerder zodra er meer bekend is.
```

### Herstelmelding

```txt
De storing is opgelost. We blijven de dienst monitoren. Excuses voor het ongemak.

Hersteld om: [tijdstip]
Getroffen onderdeel: [onderdeel]
Eventuele vervolgstap voor klanten: [stap of "geen"]
```

## Incidentregistratie

Leg per incident minimaal vast:

- incidentnummer, datum en ernst;
- start-, detectie-, communicatie-, herstel- en eindtijd;
- getroffen onderdelen en klanten;
- interne of externe oorzaak;
- uitgevoerde wijzigingen en workarounds;
- links naar relevante logs, deployments en providerincidenten;
- verzonden klantberichten;
- post-mortem en openstaande verbeteracties.

