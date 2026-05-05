import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const FROM_EMAIL = "info@bnbwebsitemaken.nl"

// Create a reusable transporter using SMTP credentials from env
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message, recipientEmail, phone } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Naam, e-mail en bericht zijn verplicht." },
        { status: 400 }
      )
    }

    const to = recipientEmail || FROM_EMAIL

    const transporter = createTransporter()

    await transporter.sendMail({
      from: `BnB Contactformulier <${process.env.SMTP_USER || FROM_EMAIL}>`,
      to,
      replyTo: email,
      subject: `Nieuw contactbericht van ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #fffbf5; border-radius: 12px;">
          <div style="border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0;">Nieuw contactbericht</h2>
            <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">
              Verzonden via het contactformulier op uw BnB-website
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 12px 8px 0; font-weight: 600; color: #374151; width: 120px; vertical-align: top;">Naam:</td>
              <td style="padding: 8px 0; color: #6b7280;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px 8px 0; font-weight: 600; color: #374151; vertical-align: top;">E-mail:</td>
              <td style="padding: 8px 0; color: #6b7280;">
                <a href="mailto:${email}" style="color: #d97706; text-decoration: none;">${email}</a>
              </td>
            </tr>
            ${
              phone
                ? `<tr>
              <td style="padding: 8px 12px 8px 0; font-weight: 600; color: #374151; vertical-align: top;">Telefoon:</td>
              <td style="padding: 8px 0; color: #6b7280;">${phone}</td>
            </tr>`
                : ""
            }
          </table>
          <div style="padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #d97706;">
            <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Bericht:</p>
            <p style="color: #6b7280; margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center;">
            Ontvangen door: ${to} &bull; Verzonden vanaf: ${FROM_EMAIL}
          </p>
        </div>
      `,
      text: `Nieuw contactbericht\n\nNaam: ${name}\nE-mail: ${email}${phone ? `\nTelefoon: ${phone}` : ""}\n\nBericht:\n${message}`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[contact] Nodemailer error:", err)
    return NextResponse.json({ error: "E-mail kon niet worden verzonden." }, { status: 500 })
  }
}
