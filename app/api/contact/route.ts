import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "info@bnbwebsitemaken.nl"

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

    const { data, error } = await resend.emails.send({
      from: `BnB Contactformulier <${FROM_EMAIL}>`,
      to: [to],
      replyTo: email,
      subject: `Nieuw contactbericht van ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #92400e; margin-bottom: 16px;">Nieuw contactbericht</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 120px;">Naam:</td>
              <td style="padding: 8px 0; color: #6b7280;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">E-mail:</td>
              <td style="padding: 8px 0; color: #6b7280;">${email}</td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">Telefoon:</td>
              <td style="padding: 8px 0; color: #6b7280;">${phone}</td>
            </tr>
            ` : ""}
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #d97706;">
            <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Bericht:</p>
            <p style="color: #6b7280; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
            Dit bericht is verzonden via het contactformulier op uw BnB-website.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("[v0] Resend error:", error)
      return NextResponse.json({ error: "E-mail kon niet worden verzonden." }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error("[v0] Contact route error:", err)
    return NextResponse.json({ error: "Er is een fout opgetreden." }, { status: 500 })
  }
}
