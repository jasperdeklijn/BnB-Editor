"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  FileText,
  Camera,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface ProfileClientProps {
  userId: string
  email: string
  initialMeta: Record<string, unknown>
}

export function ProfileClient({ userId, email, initialMeta }: ProfileClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState((initialMeta.full_name as string) ?? "")
  const [phone, setPhone] = useState((initialMeta.phone as string) ?? "")
  const [bio, setBio] = useState((initialMeta.bio as string) ?? "")
  const [avatarUrl, setAvatarUrl] = useState((initialMeta.avatar_url as string) ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${userId}/avatar.${ext}`

    const { error } = await supabase.storage
      .from("user-images")
      .upload(path, file, { upsert: true })

    if (error) {
      toast.error("Failed to upload avatar")
      setIsUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from("user-images").getPublicUrl(path)
    setAvatarUrl(urlData.publicUrl + `?t=${Date.now()}`)
    setIsUploading(false)
    toast.success("Avatar updated")
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone,
        bio,
        avatar_url: avatarUrl,
      },
    })

    setIsSaving(false)

    if (error) {
      toast.error("Failed to save profile")
      return
    }

    toast.success("Profile saved successfully")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-4 border-b border-border bg-[var(--editor-header)] px-4 py-3 md:px-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
        >
          <Link href="/editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--editor-header-fg)]" />
          <h1 className="text-lg font-semibold text-[var(--editor-header-fg)]">My Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-8">
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
            <p className="font-semibold text-foreground">{fullName || "Your Name"}</p>
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
              <h2 className="font-semibold text-foreground">Personal Information</h2>
              <p className="text-xs text-muted-foreground">Basic details shown on your profile</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2 text-sm font-medium">
                <User className="h-3.5 w-3.5 text-primary" />
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email — read-only */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={email}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                  read-only
                </span>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Bio
              </Label>
              <Textarea
                id="bio"
                placeholder="A short description about yourself and your BnB experience..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">{bio.length} / 300 characters</p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-muted/30 rounded-b-xl">
            <Button variant="outline" asChild>
              <Link href="/editor">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
