import {
  DEFAULT_WEBSITE_LOCALE,
  isSupportedWebsiteLocale,
  type SupportedWebsiteLocale,
} from "@/lib/i18n/locales"

type NotificationCopy = { subject: string; heading: string; body: string }

type InvoiceEmailCopyInput = {
  documentType: "invoice" | "credit_note"
  invoiceNumber: string
  reservationNumber: string
  customerName: string
}

type InvoiceEmailCopy = {
  subject: string
  greeting: string
  attachment: string
  manualDelivery: string
}

export function normalizeBookingEmailLocale(locale: unknown): SupportedWebsiteLocale {
  return isSupportedWebsiteLocale(locale) ? locale : DEFAULT_WEBSITE_LOCALE
}

export function getBookingEmailFallbackTitle(locale: unknown) {
  const resolvedLocale = normalizeBookingEmailLocale(locale)
  return {
    "nl-NL": "Boeking",
    "en-GB": "Booking",
    "de-DE": "Buchung",
    "fr-FR": "Réservation",
  }[resolvedLocale]
}

const NOTIFICATION_COPY: Record<SupportedWebsiteLocale, Record<string, (title: string) => NotificationCopy>> = {
  "nl-NL": {
    request_received: (title) => ({ subject: `Aanvraag ontvangen: ${title}`, heading: "Uw aanvraag is ontvangen", body: "De ondernemer beoordeelt uw aanvraag. Via de beveiligde link kunt u de status bekijken." }),
    confirmed: (title) => ({ subject: `Bevestigd: ${title}`, heading: "Uw boeking is bevestigd", body: "Uw boeking staat bevestigd in de planning." }),
    declined: (title) => ({ subject: `Aanvraag afgewezen: ${title}`, heading: "Uw aanvraag kon niet worden bevestigd", body: "De ondernemer heeft uw aanvraag afgewezen. Bekijk de status via de beveiligde link." }),
    rescheduled: (title) => ({ subject: `Nieuw tijdstip: ${title}`, heading: "Uw boeking is verplaatst", body: "Het tijdstip van uw boeking is aangepast." }),
    cancelled: (title) => ({ subject: `Geannuleerd: ${title}`, heading: "Uw boeking is geannuleerd", body: "De annulering is verwerkt." }),
    alternative_proposed: (title) => ({ subject: `Alternatief tijdstip voorgesteld: ${title}`, heading: "Er is een alternatief tijdstip voorgesteld", body: "Bekijk en accepteer het voorstel via de beveiligde link." }),
    reschedule_declined: (title) => ({ subject: `Verplaatsingsverzoek beoordeeld: ${title}`, heading: "Uw verplaatsingsverzoek is beoordeeld", body: "Bekijk de actuele status via de beveiligde link." }),
    new_request: (title) => ({ subject: `Nieuwe boekingsaanvraag: ${title}`, heading: "Nieuwe aanvraag", body: "Er staat een nieuwe aanvraag klaar in de boekingskalender." }),
    new_booking: (title) => ({ subject: `Nieuwe bevestigde boeking: ${title}`, heading: "Nieuwe boeking", body: "Er is een nieuwe bevestigde boeking aan de kalender toegevoegd." }),
    customer_cancelled: (title) => ({ subject: `Klant annuleerde: ${title}`, heading: "Boeking geannuleerd door klant", body: "De klant heeft de boeking via de beveiligde klantomgeving geannuleerd." }),
    customer_reschedule_requested: (title) => ({ subject: `Verplaatsingsverzoek: ${title}`, heading: "Klant vraagt een ander tijdstip", body: "Bekijk het voorgestelde tijdstip in de boekingskalender." }),
  },
  "en-GB": {
    request_received: (title) => ({ subject: `Request received: ${title}`, heading: "Your request has been received", body: "The business will review your request. You can check its status using the secure link." }),
    confirmed: (title) => ({ subject: `Confirmed: ${title}`, heading: "Your booking is confirmed", body: "Your booking has been confirmed in the schedule." }),
    declined: (title) => ({ subject: `Request declined: ${title}`, heading: "Your request could not be confirmed", body: "The business has declined your request. Check its status using the secure link." }),
    rescheduled: (title) => ({ subject: `New time: ${title}`, heading: "Your booking has been rescheduled", body: "The time of your booking has been changed." }),
    cancelled: (title) => ({ subject: `Cancelled: ${title}`, heading: "Your booking has been cancelled", body: "Your cancellation has been processed." }),
    alternative_proposed: (title) => ({ subject: `Alternative time proposed: ${title}`, heading: "An alternative time has been proposed", body: "Review and accept the proposal using the secure link." }),
    reschedule_declined: (title) => ({ subject: `Rescheduling request reviewed: ${title}`, heading: "Your rescheduling request has been reviewed", body: "Check the current status using the secure link." }),
    new_request: (title) => ({ subject: `New booking request: ${title}`, heading: "New request", body: "A new request is waiting in the booking calendar." }),
    new_booking: (title) => ({ subject: `New confirmed booking: ${title}`, heading: "New booking", body: "A new confirmed booking has been added to the calendar." }),
    customer_cancelled: (title) => ({ subject: `Customer cancelled: ${title}`, heading: "Booking cancelled by customer", body: "The customer cancelled the booking using the secure customer workspace." }),
    customer_reschedule_requested: (title) => ({ subject: `Rescheduling request: ${title}`, heading: "Customer requested a different time", body: "Review the proposed time in the booking calendar." }),
  },
  "de-DE": {
    request_received: (title) => ({ subject: `Anfrage erhalten: ${title}`, heading: "Ihre Anfrage ist eingegangen", body: "Der Anbieter prüft Ihre Anfrage. Über den sicheren Link können Sie den Status einsehen." }),
    confirmed: (title) => ({ subject: `Bestätigt: ${title}`, heading: "Ihre Buchung ist bestätigt", body: "Ihre Buchung wurde im Kalender bestätigt." }),
    declined: (title) => ({ subject: `Anfrage abgelehnt: ${title}`, heading: "Ihre Anfrage konnte nicht bestätigt werden", body: "Der Anbieter hat Ihre Anfrage abgelehnt. Den Status können Sie über den sicheren Link einsehen." }),
    rescheduled: (title) => ({ subject: `Neuer Termin: ${title}`, heading: "Ihre Buchung wurde verschoben", body: "Der Termin Ihrer Buchung wurde geändert." }),
    cancelled: (title) => ({ subject: `Storniert: ${title}`, heading: "Ihre Buchung wurde storniert", body: "Die Stornierung wurde verarbeitet." }),
    alternative_proposed: (title) => ({ subject: `Alternativtermin vorgeschlagen: ${title}`, heading: "Ein Alternativtermin wurde vorgeschlagen", body: "Prüfen und akzeptieren Sie den Vorschlag über den sicheren Link." }),
    reschedule_declined: (title) => ({ subject: `Terminänderung geprüft: ${title}`, heading: "Ihre Anfrage zur Terminänderung wurde geprüft", body: "Den aktuellen Status können Sie über den sicheren Link einsehen." }),
    new_request: (title) => ({ subject: `Neue Buchungsanfrage: ${title}`, heading: "Neue Anfrage", body: "Im Buchungskalender wartet eine neue Anfrage." }),
    new_booking: (title) => ({ subject: `Neue bestätigte Buchung: ${title}`, heading: "Neue Buchung", body: "Eine neue bestätigte Buchung wurde zum Kalender hinzugefügt." }),
    customer_cancelled: (title) => ({ subject: `Kunde hat storniert: ${title}`, heading: "Buchung vom Kunden storniert", body: "Der Kunde hat die Buchung über den sicheren Kundenbereich storniert." }),
    customer_reschedule_requested: (title) => ({ subject: `Anfrage zur Terminänderung: ${title}`, heading: "Kunde wünscht einen anderen Termin", body: "Prüfen Sie den vorgeschlagenen Termin im Buchungskalender." }),
  },
  "fr-FR": {
    request_received: (title) => ({ subject: `Demande reçue : ${title}`, heading: "Votre demande a bien été reçue", body: "Le prestataire va examiner votre demande. Vous pouvez consulter son statut via le lien sécurisé." }),
    confirmed: (title) => ({ subject: `Confirmé : ${title}`, heading: "Votre réservation est confirmée", body: "Votre réservation a été confirmée dans le calendrier." }),
    declined: (title) => ({ subject: `Demande refusée : ${title}`, heading: "Votre demande n’a pas pu être confirmée", body: "Le prestataire a refusé votre demande. Consultez son statut via le lien sécurisé." }),
    rescheduled: (title) => ({ subject: `Nouvel horaire : ${title}`, heading: "Votre réservation a été déplacée", body: "L’horaire de votre réservation a été modifié." }),
    cancelled: (title) => ({ subject: `Annulée : ${title}`, heading: "Votre réservation a été annulée", body: "Votre annulation a bien été prise en compte." }),
    alternative_proposed: (title) => ({ subject: `Autre horaire proposé : ${title}`, heading: "Un autre horaire vous a été proposé", body: "Consultez et acceptez la proposition via le lien sécurisé." }),
    reschedule_declined: (title) => ({ subject: `Demande de changement examinée : ${title}`, heading: "Votre demande de changement a été examinée", body: "Consultez le statut actuel via le lien sécurisé." }),
    new_request: (title) => ({ subject: `Nouvelle demande de réservation : ${title}`, heading: "Nouvelle demande", body: "Une nouvelle demande est disponible dans le calendrier de réservation." }),
    new_booking: (title) => ({ subject: `Nouvelle réservation confirmée : ${title}`, heading: "Nouvelle réservation", body: "Une nouvelle réservation confirmée a été ajoutée au calendrier." }),
    customer_cancelled: (title) => ({ subject: `Annulation par le client : ${title}`, heading: "Réservation annulée par le client", body: "Le client a annulé la réservation via son espace client sécurisé." }),
    customer_reschedule_requested: (title) => ({ subject: `Demande de changement d’horaire : ${title}`, heading: "Le client souhaite un autre horaire", body: "Consultez l’horaire proposé dans le calendrier de réservation." }),
  },
}

const FALLBACK_NOTIFICATION_COPY: Record<SupportedWebsiteLocale, (title: string) => NotificationCopy> = {
  "nl-NL": (title) => ({ subject: `Boekingsupdate: ${title}`, heading: "Boekingsupdate", body: "Er is een wijziging in de boeking." }),
  "en-GB": (title) => ({ subject: `Booking update: ${title}`, heading: "Booking update", body: "Your booking has been updated." }),
  "de-DE": (title) => ({ subject: `Buchungsaktualisierung: ${title}`, heading: "Buchungsaktualisierung", body: "Ihre Buchung wurde aktualisiert." }),
  "fr-FR": (title) => ({ subject: `Mise à jour de réservation : ${title}`, heading: "Mise à jour de réservation", body: "Votre réservation a été mise à jour." }),
}

export function getBookingNotificationCopy(type: string, title: string, locale: unknown) {
  const resolvedLocale = normalizeBookingEmailLocale(locale)
  return (NOTIFICATION_COPY[resolvedLocale][type] ?? FALLBACK_NOTIFICATION_COPY[resolvedLocale])(title)
}

export function getBookingEmailActionLabel(recipientType: "customer" | "owner", locale: unknown) {
  if (recipientType === "owner") return "Open kalender"
  const resolvedLocale = normalizeBookingEmailLocale(locale)
  return {
    "nl-NL": "Bekijk boeking",
    "en-GB": "View booking",
    "de-DE": "Buchung ansehen",
    "fr-FR": "Voir la réservation",
  }[resolvedLocale]
}

export function getInvoiceEmailCopy(input: InvoiceEmailCopyInput, locale: unknown): InvoiceEmailCopy {
  const resolvedLocale = normalizeBookingEmailLocale(locale)
  const labels = {
    "nl-NL": input.documentType === "credit_note" ? "creditfactuur" : "factuur",
    "en-GB": input.documentType === "credit_note" ? "credit note" : "invoice",
    "de-DE": input.documentType === "credit_note" ? "Gutschrift" : "Rechnung",
    "fr-FR": input.documentType === "credit_note" ? "avoir" : "facture",
  }
  const label = labels[resolvedLocale]
  const capitalizedLabel = `${label[0].toUpperCase()}${label.slice(1)}`
  const copy: Record<SupportedWebsiteLocale, InvoiceEmailCopy> = {
    "nl-NL": { subject: `${capitalizedLabel} ${input.invoiceNumber}`, greeting: `Beste ${input.customerName || "klant"},`, attachment: `In de bijlage vindt u ${label} ${input.invoiceNumber} voor reservering ${input.reservationNumber}.`, manualDelivery: "Deze e-mail is handmatig door de ondernemer verzonden." },
    "en-GB": { subject: `${capitalizedLabel} ${input.invoiceNumber}`, greeting: `Dear ${input.customerName || "customer"},`, attachment: `Please find attached ${label} ${input.invoiceNumber} for reservation ${input.reservationNumber}.`, manualDelivery: "This email was sent manually by the business." },
    "de-DE": { subject: `${capitalizedLabel} ${input.invoiceNumber}`, greeting: `Guten Tag ${input.customerName || "Kunde"},`, attachment: `Im Anhang finden Sie die ${label} ${input.invoiceNumber} für die Reservierung ${input.reservationNumber}.`, manualDelivery: "Diese E-Mail wurde vom Anbieter manuell versendet." },
    "fr-FR": { subject: `${capitalizedLabel} ${input.invoiceNumber}`, greeting: `Bonjour ${input.customerName || "client"},`, attachment: `Vous trouverez en pièce jointe ${input.documentType === "credit_note" ? "l’" : "la "}${label} ${input.invoiceNumber} pour la réservation ${input.reservationNumber}.`, manualDelivery: "Cet e-mail a été envoyé manuellement par le prestataire." },
  }
  return copy[resolvedLocale]
}
