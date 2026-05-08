import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

const FROM_EMAIL = process.env.SMTP_FROM?.trim() || "info@bnbwebsitemaken.nl"

function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are not configured.")
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
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

    const to = recipientEmail?.trim() || FROM_EMAIL

    const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || FROM_EMAIL

    console.log("[contact] Sending email to:", to, "from:", fromAddress)

    const transporter = createTransporter()
    await transporter.verify()

    const logoPath = `${process.cwd()}/public/logo_klein.png`

    const result = await transporter.sendMail({
      from: `BnB Website <${fromAddress}>`,
      to,
      replyTo: `${name} <${email}>`,
      subject: `Nieuw contactbericht van ${name}`,
      html: `
    <div style="
      margin:0;
      padding:40px 20px;
      background:#020617;
      font-family:Arial, Helvetica, sans-serif;
      color:#ffffff;
    ">

      <div style="
        max-width:640px;
        margin:0 auto;
        background:#050b2c;
        border:1px solid rgba(99,102,241,0.18);
        border-radius:28px;
        overflow:hidden;
        box-shadow:0 25px 80px rgba(0,0,0,0.45);
      ">

        <!-- HERO -->
        <div style="
          padding:42px 38px 34px 38px;
          background:
            linear-gradient(
              135deg,
              rgba(37,99,235,0.18) 0%,
              rgba(139,92,246,0.18) 50%,
              rgba(217,70,239,0.12) 100%
            ),
            #050b2c;
          text-align:center;
          border-bottom:1px solid rgba(99,102,241,0.15);
        ">

          <img
            src="cid:bnb-logo"
            alt="BnB Website Maken"
            style="
              width:72px;
              height:auto;
              margin-bottom:20px;
            "
          />

          <div style="
            display:inline-block;
            padding:8px 16px;
            border-radius:999px;
            background:rgba(124,58,237,0.15);
            border:1px solid rgba(168,85,247,0.3);
            color:#a855f7;
            font-size:13px;
            font-weight:600;
            margin-bottom:22px;
          ">
            Nieuw contactbericht
          </div>

          <h1 style="
            margin:0;
            font-size:42px;
            line-height:1.1;
            font-weight:800;
            letter-spacing:-1px;
            color:#ffffff;
          ">
            Nieuwe aanvraag
            <span style="
              background:linear-gradient(90deg,#2563eb 0%, #7c3aed 55%, #a855f7 100%);
              -webkit-background-clip:text;
              -webkit-text-fill-color:transparent;
              background-clip:text;
              color:transparent;
            ">
              ontvangen
            </span>
          </h1>

          <p style="
            margin:18px auto 0 auto;
            max-width:460px;
            color:rgba(255,255,255,0.7);
            font-size:16px;
            line-height:1.7;
          ">
            Er is een nieuw bericht verzonden via het contactformulier van jouw BnB website.
          </p>
        </div>

        <!-- CONTENT -->
        <div style="padding:38px;">

          <div style="
            background:rgba(15,23,42,0.95);
            border:1px solid rgba(99,102,241,0.14);
            border-radius:22px;
            padding:28px;
            margin-bottom:28px;
          ">

            <table style="
              width:100%;
              border-collapse:collapse;
            ">

              <tr>
                <td style="
                  padding:14px 0;
                  width:130px;
                  color:#a5b4fc;
                  font-weight:700;
                  vertical-align:top;
                ">
                  Naam
                </td>

                <td style="
                  padding:14px 0;
                  color:#ffffff;
                  font-size:15px;
                ">
                  ${name}
                </td>
              </tr>

              <tr>
                <td style="
                  padding:14px 0;
                  color:#a5b4fc;
                  font-weight:700;
                  vertical-align:top;
                ">
                  E-mail
                </td>

                <td style="
                  padding:14px 0;
                  font-size:15px;
                ">
                  <a
                    href="mailto:${email}"
                    style="
                      color:#8b5cf6;
                      text-decoration:none;
                      font-weight:600;
                    "
                  >
                    ${email}
                  </a>
                </td>
              </tr>

              ${
                phone
                  ? `
              <tr>
                <td style="
                  padding:14px 0;
                  color:#a5b4fc;
                  font-weight:700;
                  vertical-align:top;
                ">
                  Telefoon
                </td>

                <td style="
                  padding:14px 0;
                  color:#ffffff;
                  font-size:15px;
                ">
                  ${phone}
                </td>
              </tr>
              `
                  : ""
              }

            </table>
          </div>

          <!-- MESSAGE -->
          <div style="
            position:relative;
            background:
              linear-gradient(
                135deg,
                rgba(37,99,235,0.08) 0%,
                rgba(124,58,237,0.10) 100%
              );
            border:1px solid rgba(99,102,241,0.16);
            border-radius:24px;
            padding:30px;
          ">

            <div style="
              font-size:14px;
              font-weight:700;
              letter-spacing:0.4px;
              text-transform:uppercase;
              color:#a855f7;
              margin-bottom:18px;
            ">
              Bericht
            </div>

            <div style="
              color:rgba(255,255,255,0.82);
              font-size:16px;
              line-height:1.9;
              white-space:pre-wrap;
            ">
              ${message}
            </div>
          </div>

          <!-- CTA -->
          <div style="
            margin-top:30px;
            text-align:center;
          ">
            <a
              href="mailto:${email}"
              style="
                display:inline-block;
                padding:16px 28px;
                border-radius:14px;
                background:linear-gradient(
                  90deg,
                  #2563eb 0%,
                  #7c3aed 55%,
                  #a855f7 100%
                );
                color:#ffffff;
                font-weight:700;
                font-size:15px;
                text-decoration:none;
              "
            >
              Direct beantwoorden
            </a>
          </div>

          <!-- FOOTER -->
          <div style="
            margin-top:34px;
            padding-top:24px;
            border-top:1px solid rgba(99,102,241,0.14);
            text-align:center;
          ">
            <p style="
              margin:0;
              color:rgba(255,255,255,0.38);
              font-size:12px;
              line-height:1.8;
            ">
              Ontvangen door: ${to}<br />
              Verzonden vanaf: ${FROM_EMAIL}
            </p>
          </div>

        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: "logo_klein.png",
      path: logoPath,
      cid: "bnb-logo",
    },
  ],
  text: `Nieuw contactbericht

Naam: ${name}
E-mail: ${email}${phone ? `\nTelefoon: ${phone}` : ""}

Bericht:
${message}`,
});

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[contact] Nodemailer error:", err)
    return NextResponse.json(
      { error: "E-mail kon niet worden verzonden. Probeer het later opnieuw." },
      { status: 500 }
    )
  }
}
