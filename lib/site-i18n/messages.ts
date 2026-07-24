import type { SupportedWebsiteLocale } from "@/lib/i18n/locales"

export interface SiteMessages {
  language: string
  menu: string
  closeMenu: string
  name: string
  email: string
  phone: string
  message: string
  date: string
  service: string
  budget: string
  submit: string
  submitting: string
  success: string
  error: string
  closed: string
  requestReceived: string
  previewSuccess: string
  openingHours: string
  today: string
  appointment: string
  booking: string
  appointmentRequest: string
  bookingRequest: string
  accommodation: string
  checkInDate: string
  previewNoSubmission: string
  pricing: string
  mostPopular: string
  individualRates: string
  offering: string
  moreInfo: string
  request: string
  availabilityHelp: string
  bookStay: string
  bookStayIntro: string
  requestBooking: string
  bookingSuccess: string
  bookingHelper: string
  planAppointment: string
  appointmentIntro: string
  requestAppointment: string
  appointmentSuccess: string
  appointmentHelper: string
  address: string
  companyDetails: string
  registrationNumber: string
  vatNumber: string
  contact: string
  sendMessage: string
  visitUs: string
  price: string
  capacity: string
  team: string
  imagePlaceholder: string
  whatsappPreview: string
  location: string
  openMaps: string
  rightsReserved: string
  addTeam: string
  quoteRequest: string
  whatsappUs: string
  openWhatsApp: string
  contactSoon: string
  previewNoRequest: string
  cookieTitle: string
  cookieDescription: string
  cookiePolicy: string
  cookieNecessary: string
  cookieAccept: string
  cookieSettings: string
}

export const SITE_MESSAGES: Record<SupportedWebsiteLocale, SiteMessages> = {
  "nl-NL": {
    language: "Taal", menu: "Menu openen", closeMenu: "Menu sluiten", name: "Naam",
    email: "E-mailadres", phone: "Telefoonnummer", message: "Bericht", date: "Gewenste datum",
    service: "Gewenste dienst", budget: "Budget", submit: "Versturen", submitting: "Versturen...",
    success: "Bedankt! Uw aanvraag is verzonden.", error: "Verzenden is niet gelukt. Probeer het opnieuw.",
    closed: "Gesloten", requestReceived: "Aanvraag ontvangen!", previewSuccess: "Preview geslaagd", openingHours: "Openingstijden", today: "Vandaag",
    appointment: "Afspraak", booking: "Boeking", appointmentRequest: "Afspraakaanvraag", bookingRequest: "Boekingsaanvraag", accommodation: "Accommodatie", checkInDate: "Check-in datum", previewNoSubmission: "Preview geslaagd — er is niets aangemaakt.", pricing: "Tarieven", mostPopular: "Meest gekozen", individualRates: "Losse tarieven",
    offering: "Aanbod", moreInfo: "Meer info", request: "Aanvragen", availabilityHelp: "Neem contact op voor beschikbaarheid, planning en mogelijkheden.", bookStay: "Boek je verblijf", bookStayIntro: "Kies een accommodatie en stuur een boekingsaanvraag met je gewenste check-in datum.", requestBooking: "Boeking aanvragen", bookingSuccess: "Boekingsaanvraag ontvangen. We nemen zo snel mogelijk contact met je op.", bookingHelper: "Je aanvraag wordt als voorlopige boeking in de planning gezet.", planAppointment: "Plan een afspraak", appointmentIntro: "Kies een dienst en stuur een aanvraag met je gewenste datum en tijd.", requestAppointment: "Afspraak aanvragen", appointmentSuccess: "Aanvraag ontvangen. We nemen zo snel mogelijk contact met je op.", appointmentHelper: "Je aanvraag wordt als voorlopige afspraak in de planning gezet.",
    address: "Adres", companyDetails: "Bedrijfsgegevens", registrationNumber: "KvK", vatNumber: "BTW", contact: "Contact", sendMessage: "Stuur een bericht", visitUs: "Kom langs", price: "Prijs", capacity: "Capaciteit", team: "Ons team", imagePlaceholder: "Sleep hier een afbeelding uit de beeldbank", whatsappPreview: "Preview: WhatsApp wordt niet geopend.",
    location: "Locatie", openMaps: "Open in Google Maps", rightsReserved: "Alle rechten voorbehouden.", addTeam: "Voeg teamleden toe in de editor.",
    quoteRequest: "Offerte aanvragen", whatsappUs: "WhatsApp ons", openWhatsApp: "Open WhatsApp",
    cookieTitle: "Jouw privacyvoorkeuren", cookieDescription: "We gebruiken noodzakelijke cookies om deze website goed te laten werken. Met jouw toestemming gebruiken we ook privacyvriendelijke statistieken om de website te verbeteren.", cookiePolicy: "Lees het cookiebeleid", cookieNecessary: "Alleen noodzakelijk", cookieAccept: "Alles accepteren", cookieSettings: "Cookie-instellingen",
    contactSoon: "We nemen zo snel mogelijk contact met je op.", previewNoRequest: "Er is geen aanvraag opgeslagen of verzonden.",
  },
  "en-GB": {
    language: "Language", menu: "Open menu", closeMenu: "Close menu", name: "Name",
    email: "Email address", phone: "Phone number", message: "Message", date: "Preferred date",
    service: "Preferred service", budget: "Budget", submit: "Send", submitting: "Sending...",
    success: "Thank you! Your request has been sent.", error: "Your request could not be sent. Please try again.",
    closed: "Closed", requestReceived: "Request received!", previewSuccess: "Preview successful", openingHours: "Opening hours", today: "Today",
    appointment: "Appointment", booking: "Booking", appointmentRequest: "Appointment request", bookingRequest: "Booking request", accommodation: "Accommodation", checkInDate: "Check-in date", previewNoSubmission: "Preview successful — nothing was created.", pricing: "Pricing", mostPopular: "Most popular", individualRates: "Individual rates",
    offering: "Services", moreInfo: "More info", request: "Request", availabilityHelp: "Contact us about availability, scheduling, and options.", bookStay: "Book your stay", bookStayIntro: "Choose an accommodation and submit a booking request with your preferred check-in date.", requestBooking: "Request booking", bookingSuccess: "Booking request received. We will contact you as soon as possible.", bookingHelper: "Your request will be placed in the schedule as a provisional booking.", planAppointment: "Schedule an appointment", appointmentIntro: "Choose a service and submit a request with your preferred date and time.", requestAppointment: "Request appointment", appointmentSuccess: "Request received. We will contact you as soon as possible.", appointmentHelper: "Your request will be placed in the schedule as a provisional appointment.",
    address: "Address", companyDetails: "Company details", registrationNumber: "Registration", vatNumber: "VAT", contact: "Contact", sendMessage: "Send a message", visitUs: "Visit us", price: "Price", capacity: "Capacity", team: "Our team", imagePlaceholder: "Drag an image here from the image library", whatsappPreview: "Preview: WhatsApp will not open.",
    location: "Location", openMaps: "Open in Google Maps", rightsReserved: "All rights reserved.", addTeam: "Add team members in the editor.",
    quoteRequest: "Request a quote", whatsappUs: "Message us on WhatsApp", openWhatsApp: "Open WhatsApp",
    cookieTitle: "Your privacy preferences", cookieDescription: "We use necessary cookies to make this website work. With your permission, we also use privacy-friendly statistics to improve the website.", cookiePolicy: "Read the cookie policy", cookieNecessary: "Necessary only", cookieAccept: "Accept all", cookieSettings: "Cookie settings",
    contactSoon: "We will contact you as soon as possible.", previewNoRequest: "No request was stored or sent.",
  },
  "fr-FR": {
    language: "Langue", menu: "Ouvrir le menu", closeMenu: "Fermer le menu", name: "Nom",
    email: "Adresse e-mail", phone: "Numéro de téléphone", message: "Message", date: "Date souhaitée",
    service: "Service souhaité", budget: "Budget", submit: "Envoyer", submitting: "Envoi en cours...",
    success: "Merci ! Votre demande a été envoyée.", error: "Votre demande n’a pas pu être envoyée. Veuillez réessayer.",
    closed: "Fermé", requestReceived: "Demande reçue !", previewSuccess: "Aperçu réussi", openingHours: "Horaires d’ouverture", today: "Aujourd’hui",
    appointment: "Rendez-vous", booking: "Réservation", appointmentRequest: "Demande de rendez-vous", bookingRequest: "Demande de réservation", accommodation: "Hébergement", checkInDate: "Date d’arrivée", previewNoSubmission: "Aperçu réussi — aucune donnée n’a été créée.", pricing: "Tarifs", mostPopular: "Le plus populaire", individualRates: "Tarifs à l’unité",
    offering: "Services", moreInfo: "En savoir plus", request: "Demander", availabilityHelp: "Contactez-nous pour connaître les disponibilités, le planning et les possibilités.", bookStay: "Réservez votre séjour", bookStayIntro: "Choisissez un hébergement et envoyez une demande de réservation avec la date d’arrivée souhaitée.", requestBooking: "Demander une réservation", bookingSuccess: "Demande de réservation reçue. Nous vous contacterons dès que possible.", bookingHelper: "Votre demande sera ajoutée au planning comme réservation provisoire.", planAppointment: "Prendre rendez-vous", appointmentIntro: "Choisissez un service et envoyez une demande avec la date et l’heure souhaitées.", requestAppointment: "Demander un rendez-vous", appointmentSuccess: "Demande reçue. Nous vous contacterons dès que possible.", appointmentHelper: "Votre demande sera ajoutée au planning comme rendez-vous provisoire.",
    address: "Adresse", companyDetails: "Informations sur l’entreprise", registrationNumber: "Immatriculation", vatNumber: "TVA", contact: "Contact", sendMessage: "Envoyer un message", visitUs: "Nous rendre visite", price: "Prix", capacity: "Capacité", team: "Notre équipe", imagePlaceholder: "Faites glisser ici une image de la bibliothèque", whatsappPreview: "Aperçu : WhatsApp ne sera pas ouvert.",
    location: "Localisation", openMaps: "Ouvrir dans Google Maps", rightsReserved: "Tous droits réservés.", addTeam: "Ajoutez des membres de l’équipe dans l’éditeur.",
    quoteRequest: "Demander un devis", whatsappUs: "Nous contacter sur WhatsApp", openWhatsApp: "Ouvrir WhatsApp",
    cookieTitle: "Vos préférences de confidentialité", cookieDescription: "Nous utilisons des cookies nécessaires au fonctionnement de ce site. Avec votre accord, nous utilisons aussi des statistiques respectueuses de la vie privée pour améliorer le site.", cookiePolicy: "Lire la politique relative aux cookies", cookieNecessary: "Nécessaires uniquement", cookieAccept: "Tout accepter", cookieSettings: "Paramètres des cookies",
    contactSoon: "Nous vous contacterons dès que possible.", previewNoRequest: "Aucune demande n’a été enregistrée ni envoyée.",
  },
  "de-DE": {
    language: "Sprache", menu: "Menü öffnen", closeMenu: "Menü schließen", name: "Name",
    email: "E-Mail-Adresse", phone: "Telefonnummer", message: "Nachricht", date: "Wunschtermin",
    service: "Gewünschte Leistung", budget: "Budget", submit: "Senden", submitting: "Wird gesendet...",
    success: "Vielen Dank! Ihre Anfrage wurde gesendet.", error: "Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    closed: "Geschlossen", requestReceived: "Anfrage erhalten!", previewSuccess: "Vorschau erfolgreich", openingHours: "Öffnungszeiten", today: "Heute",
    appointment: "Termin", booking: "Buchung", appointmentRequest: "Terminanfrage", bookingRequest: "Buchungsanfrage", accommodation: "Unterkunft", checkInDate: "Anreisedatum", previewNoSubmission: "Vorschau erfolgreich — es wurde nichts erstellt.", pricing: "Preise", mostPopular: "Beliebteste Wahl", individualRates: "Einzelpreise",
    offering: "Angebot", moreInfo: "Mehr erfahren", request: "Anfragen", availabilityHelp: "Kontaktieren Sie uns zu Verfügbarkeit, Planung und Möglichkeiten.", bookStay: "Aufenthalt buchen", bookStayIntro: "Wählen Sie eine Unterkunft und senden Sie eine Buchungsanfrage mit Ihrem gewünschten Anreisedatum.", requestBooking: "Buchung anfragen", bookingSuccess: "Buchungsanfrage erhalten. Wir melden uns so schnell wie möglich.", bookingHelper: "Ihre Anfrage wird als vorläufige Buchung eingeplant.", planAppointment: "Termin vereinbaren", appointmentIntro: "Wählen Sie eine Leistung und senden Sie eine Anfrage mit Ihrem Wunschtermin.", requestAppointment: "Termin anfragen", appointmentSuccess: "Anfrage erhalten. Wir melden uns so schnell wie möglich.", appointmentHelper: "Ihre Anfrage wird als vorläufiger Termin eingeplant.",
    address: "Adresse", companyDetails: "Unternehmensdaten", registrationNumber: "Handelsregister", vatNumber: "USt-IdNr.", contact: "Kontakt", sendMessage: "Nachricht senden", visitUs: "Besuchen Sie uns", price: "Preis", capacity: "Kapazität", team: "Unser Team", imagePlaceholder: "Ziehen Sie hier ein Bild aus der Bildbibliothek hinein", whatsappPreview: "Vorschau: WhatsApp wird nicht geöffnet.",
    location: "Standort", openMaps: "In Google Maps öffnen", rightsReserved: "Alle Rechte vorbehalten.", addTeam: "Fügen Sie Teammitglieder im Editor hinzu.",
    quoteRequest: "Angebot anfragen", whatsappUs: "WhatsApp-Nachricht", openWhatsApp: "WhatsApp öffnen",
    cookieTitle: "Ihre Datenschutzeinstellungen", cookieDescription: "Wir verwenden notwendige Cookies, damit diese Website funktioniert. Mit Ihrer Zustimmung nutzen wir außerdem datenschutzfreundliche Statistiken, um die Website zu verbessern.", cookiePolicy: "Cookie-Richtlinie lesen", cookieNecessary: "Nur notwendige", cookieAccept: "Alle akzeptieren", cookieSettings: "Cookie-Einstellungen",
    contactSoon: "Wir melden uns so schnell wie möglich.", previewNoRequest: "Es wurde keine Anfrage gespeichert oder gesendet.",
  },
}

export function getSiteMessages(locale: SupportedWebsiteLocale) {
  return SITE_MESSAGES[locale]
}
