import "server-only"

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto"

const SECRET_VERSION = "v1"

function configuredSecret() {
  const value = process.env.CALENDAR_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!value) {
    throw new Error("CALENDAR_SECRET_KEY ontbreekt. Configureer deze server-side voordat u kalenderkoppelingen beheert.")
  }
  return value
}

function encryptionKey() {
  return createHash("sha256").update(configuredSecret(), "utf8").digest()
}

export function encryptCalendarSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [SECRET_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":")
}

export function decryptCalendarSecret(value: string) {
  if (/^https:\/\//i.test(value)) return value
  const [version, ivValue, tagValue, encryptedValue] = value.split(":")
  if (version !== SECRET_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("De opgeslagen kalenderkoppeling kan niet worden ontsleuteld.")
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"))
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    throw new Error("De opgeslagen kalenderkoppeling kan niet worden ontsleuteld. Controleer CALENDAR_SECRET_KEY.")
  }
}

export function calendarSecretFingerprint(value: string) {
  return createHmac("sha256", encryptionKey()).update(value, "utf8").digest("hex")
}

export function createCalendarAccessToken() {
  return randomBytes(32).toString("base64url")
}

export function hashCalendarAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

