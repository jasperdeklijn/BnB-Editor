"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  User,
  Mail,
  Phone,
  FileText,
  Camera,
  Loader2,
  CheckCircle2,
  Download,
  Globe2,
  KeyRound,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ProfileClientProps {
  userId: string
  email: string
  initialMeta: Record<string, unknown>
  initialProfile: {
    first_name: string
    last_name: string
    full_name: string
    phone: string | null
    job_title: string | null
    bio: string | null
    avatar_url: string | null
    locale: string
  } | null
  initialWebsites: Array<{ id: string; title: string; slug: string }>
}

export function ProfileClient({ userId, email, initialMeta, initialProfile, initialWebsites }: ProfileClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const legacyFullName = (initialMeta.full_name as string) ?? ""
  const legacyNameParts = legacyFullName.trim().split(/\s+/)
  const [firstName, setFirstName] = useState(initialProfile?.first_name || legacyNameParts[0] || "")
  const [lastName, setLastName] = useState(initialProfile?.last_name || legacyNameParts.slice(1).join(" ") || "")
  const [phone, setPhone] = useState(initialProfile?.phone ?? (initialMeta.phone as string) ?? "")
  const [jobTitle, setJobTitle] = useState(initialProfile?.job_title ?? "")
  const [locale, setLocale] = useState(initialProfile?.locale ?? "nl-NL")
  const [bio, setBio] = useState(initialProfile?.bio ?? (initialMeta.bio as string) ?? "")
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url ?? (initialMeta.avatar_url as string) ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [websites, setWebsites] = useState(initialWebsites)
  const [isExporting, setIsExporting] = useState(false)
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<string | null>(null)
  const [accountConfirmation, setAccountConfirmation] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const { setIsSaving: setHeaderSaving, setSaveState } = useEditorLayout()
  const fullName = `${firstName} ${lastName}`.trim()

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setHeaderSaving(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${userId}/avatars/avatar.${ext}`

    const { error } = await supabase.storage
      .from("user-images")
      .upload(path, file, { upsert: true })

    if (error) {
      toast.error("Failed to upload avatar")
      setIsUploading(false)
      setHeaderSaving(false)
      setSaveState("error")
      return
    }

    const { data: urlData } = supabase.storage.from("user-images").getPublicUrl(path)
    setAvatarUrl(urlData.publicUrl + `?t=${Date.now()}`)
    setIsUploading(false)
    setHeaderSaving(false)
    toast.success("Avatar updated")
  }

  const handleSave = async () => {
    setIsSaving(true)
    setHeaderSaving(true)
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phone, jobTitle, bio, avatarUrl, locale }),
    })
    const result = await response.json().catch(() => ({}))

    setIsSaving(false)
    setHeaderSaving(false)

    if (!response.ok) {
      setSaveState("error")
      toast.error(result.error || "Profiel kon niet worden opgeslagen")
      return
    }

    toast.success("Profiel opgeslagen")
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/account/export", { cache: "no-store" })
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `flexpagina-export-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("Gegevens zijn geëxporteerd")
    } catch {
      toast.error("Gegevens konden niet worden geëxporteerd")
    } finally {
      setIsExporting(false)
    }
  }

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword.length < 8) {
      toast.error("Gebruik minimaal 8 tekens voor uw nieuwe wachtwoord")
      return
    }
    if (newPassword !== repeatPassword) {
      toast.error("De nieuwe wachtwoorden komen niet overeen")
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Wachtwoord kon niet worden gewijzigd")

      setCurrentPassword("")
      setNewPassword("")
      setRepeatPassword("")
      toast.success("Wachtwoord gewijzigd")
    } catch (changeError) {
      toast.error(changeError instanceof Error ? changeError.message : "Wachtwoord kon niet worden gewijzigd")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteWebsite = async (websiteId: string) => {
    setDeletingWebsiteId(websiteId)
    try {
      const response = await fetch("/api/websites/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Website kon niet worden verwijderd")
      setWebsites((current) => current.filter((website) => website.id !== websiteId))
      toast.success("Website verwijderd")
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Website kon niet worden verwijderd")
    } finally {
      setDeletingWebsiteId(null)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: accountConfirmation }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Account kon niet worden verwijderd")
      window.location.assign("/")
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Account kon niet worden verwijderd")
      setIsDeletingAccount(false)
    }
  }

  return (
    <EditorPageShell
      title="Profiel"
      description="Werk uw persoonlijke gegevens, avatar en contactinformatie bij."
      maxWidth="2xl"
    >
        {/* Avatar */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-primary/30 bg-secondary flex items-center justify-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile avatar"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-primary/50" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
              aria-label="Upload avatar"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{fullName || "Uw naam"}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Persoonlijke informatie</h2>
              <p className="text-xs text-muted-foreground">Basisgegevens voor uw profiel</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-medium"><User className="h-3.5 w-3.5 text-primary" />Voornaam</Label>
                <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Achternaam</Label>
                <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            {/* Email — read-only */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-primary" />
                E-mailadres
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={email}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                  alleen lezen
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Telefoonnummer
              </Label>
              <Input
                id="phone"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium">Functie of rol</Label>
                <Input id="jobTitle" autoComplete="organization-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale" className="text-sm font-medium">Taal van FlexPagina</Label>
                <select id="locale" value={locale} onChange={(e) => setLocale(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="nl-NL">Nederlands</option><option value="en-GB">English</option><option value="de-DE">Deutsch</option><option value="fr-FR">Français</option>
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Profieltekst
              </Label>
              <Textarea
                id="bio"
                placeholder="Een korte beschrijving over uzelf en uw bedrijfservaring..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">{bio.length} / 300 tekens</p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-muted/30 rounded-b-xl">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Profiel opslaan
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary"><KeyRound className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold text-foreground">Wachtwoord wijzigen</h2>
              <p className="text-xs text-muted-foreground">Bevestig eerst uw huidige wachtwoord.</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="current-password">Huidig wachtwoord</Label>
              <Input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nieuw wachtwoord</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repeat-new-password">Nieuw wachtwoord herhalen</Label>
                <Input
                  id="repeat-new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Gebruik minimaal 8 tekens.</p>
              <Button type="submit" disabled={isChangingPassword || !currentPassword || !newPassword || !repeatPassword}>
                {isChangingPassword ? <Loader2 className="animate-spin" /> : <KeyRound />}
                {isChangingPassword ? "Wijzigen…" : "Wachtwoord wijzigen"}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-6 py-4">
            <div className="rounded-md bg-primary/15 p-1.5 text-primary"><Download className="h-4 w-4" /></div>
            <div>
              <h2 className="font-semibold text-foreground">Gegevens en websites</h2>
              <p className="text-xs text-muted-foreground">Exporteer uw gegevens of verwijder een website.</p>
            </div>
          </div>
          <div className="space-y-5 p-6">
            <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">Data-export</p>
                <p className="text-sm text-muted-foreground">Download account-, website-, aanvraag- en agendagegevens als JSON.</p>
              </div>
              <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                JSON downloaden
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">Mijn websites</p>
                <p className="text-sm text-muted-foreground">Verwijderen wist ook secties en overgangen. Deze actie kan niet ongedaan worden gemaakt.</p>
              </div>
              {websites.length ? websites.map((website) => (
                <div key={website.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-foreground"><Globe2 className="h-4 w-4 text-primary" />{website.title}</p>
                    <p className="truncate text-xs text-muted-foreground">/{website.slug}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" disabled={deletingWebsiteId === website.id}>
                        <Trash2 /> Verwijderen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Website definitief verwijderen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {website.title} en alle bijbehorende secties worden verwijderd. Maak eerst een JSON-export als u de gegevens wilt bewaren.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDeleteWebsite(website.id)}>Website verwijderen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )) : <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Er zijn geen websites om te verwijderen.</p>}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-destructive/20 px-6 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-semibold text-foreground">Account verwijderen</h2>
              <p className="text-xs text-muted-foreground">Verwijdert uw account en gekoppelde gegevens definitief.</p>
            </div>
          </div>
          <div className="p-6">
            <AlertDialog onOpenChange={(open) => { if (!open) setAccountConfirmation("") }}>
              <AlertDialogTrigger asChild><Button type="button" variant="destructive"><Trash2 />Account verwijderen</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Account definitief verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hiermee worden uw websites, bedrijfsgegevens, diensten, agenda en uploads verwijderd. Download vooraf een export. Typ uw e-mailadres om door te gaan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">Typ {email}</Label>
                  <Input id="delete-confirmation" value={accountConfirmation} onChange={(event) => setAccountConfirmation(event.target.value)} autoComplete="off" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" disabled={accountConfirmation.trim().toLowerCase() !== email.toLowerCase() || isDeletingAccount} onClick={handleDeleteAccount}>
                    {isDeletingAccount ? "Verwijderen…" : "Account definitief verwijderen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
    </EditorPageShell>
  )
}

