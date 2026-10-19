import { z } from "zod"

export const cartPresentationSchema = z.object({
  title: z.string().max(160).default("Jouw boeking"),
  intro: z
    .string()
    .max(1500)
    .default("Kies je diensten en plan alles in één afspraak."),
  buttonLabel: z.string().max(80).default(""),
  successText: z
    .string()
    .max(1000)
    .default(
      "Je boeking is ontvangen. Je ontvangt een bevestiging per e-mail.",
    ),
  paymentInstructions: z
    .string()
    .max(1000)
    .default("Je betaalt rechtstreeks aan de ondernemer."),
  showPrices: z.boolean().default(true),
  layout: z.enum(["beside", "below"]).default("beside"),
  logo: z.string().max(2000).default(""),
  background: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8}|transparent)?$/)
    .default(""),
  textColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8})?$/)
    .default(""),
  accentColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8})?$/)
    .default(""),
  buttonStyle: z.enum(["rounded", "square", "pill"]).default("rounded"),
  fontFamily: z
    .enum(["inherit", "sans-serif", "serif", "monospace"])
    .default("inherit"),
  hiddenExtraIds: z.array(z.string().max(170)).max(400).default([]),
})
export type CartPresentation = z.infer<typeof cartPresentationSchema>
export function getCartPresentation(
  data: Record<string, unknown>,
): CartPresentation {
  const fields = {
    title: data.bookingCartTitle,
    intro: data.bookingCartIntro,
    buttonLabel: data.bookingCartButtonLabel,
    successText: data.bookingCartSuccessText,
    paymentInstructions: data.bookingCartPaymentInstructions,
    showPrices: data.bookingCartShowPrices,
    layout: data.bookingCartLayout,
    logo: data.bookingCartLogo,
    background: data.bookingCartBackground,
    textColor: data.bookingCartTextColor,
    accentColor: data.bookingCartAccentColor,
    buttonStyle: data.bookingCartButtonStyle,
    fontFamily: data.bookingCartFontFamily,
    hiddenExtraIds: data.bookingCartHiddenExtraIds,
  }
  const defaults = cartPresentationSchema.parse({})
  for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
    const result = cartPresentationSchema.shape[key].safeParse(fields[key])
    if (result.success) Object.assign(defaults, { [key]: result.data })
  }
  return defaults
}
