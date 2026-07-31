"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ImageIcon, Loader2, Search, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { loadUserImages, MAX_USER_IMAGE_TOTAL_SIZE, uploadUserImage, type UserImageAsset } from "@/lib/user-images"

interface SectionImagePickerProps {
  userId: string
  label: string
  value?: string
  onSelect: (url: string) => void
}

export function SectionImagePicker({ userId, label, value, onSelect }: SectionImagePickerProps) {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<UserImageAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    loadUserImages(createClient(), userId)
      .then(setImages)
      .catch(() => toast.error("Afbeeldingen konden niet worden geladen."))
      .finally(() => setLoading(false))
  }, [open, userId])

  const filteredImages = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("nl")
    if (!normalized) return images
    return images.filter((image) => image.name.toLocaleLowerCase("nl").includes(normalized))
  }, [images, query])

  const choose = (url: string) => {
    onSelect(url)
    setOpen(false)
  }

  const upload = async (file?: File) => {
    if (!file) return
    const currentUsage = images.reduce((total, image) => total + image.storageSize, 0)
    if (currentUsage + file.size > MAX_USER_IMAGE_TOTAL_SIZE) {
      toast.error("Je opslaglimiet van 50 MB is bereikt.")
      return
    }
    setUploading(true)
    try {
      const image = await uploadUserImage(createClient(), userId, file)
      setImages((current) => [image, ...current])
      choose(image.url)
      toast.success("Afbeelding geüpload en gekozen.")
    } catch (error) {
      toast.error("Uploaden is mislukt", {
        description: error instanceof Error ? error.message : "Probeer een andere afbeelding.",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setOpen(true)}>
        <ImageIcon className="h-4 w-4" />
        {value ? "Andere kiezen" : label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{label}</AlertDialogTitle>
            <AlertDialogDescription>Kies een bestaande afbeelding of upload direct een nieuw bestand.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zoek op naam" className="pl-9" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredImages.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredImages.map((image) => {
                  const selected = value === image.url
                  return (
                    <button key={image.id} type="button" onClick={() => choose(image.url)} className={`group overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}>
                      <span className="relative block aspect-[4/3] overflow-hidden bg-muted">
                        <img src={image.previewUrl} alt={image.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        {selected ? <span className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground"><Check className="h-3.5 w-3.5" /></span> : null}
                      </span>
                      <span className="block truncate px-2 py-2 text-xs font-medium text-foreground">{image.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Geen afbeeldingen gevonden</p>
                <p className="text-xs text-muted-foreground">Upload hieronder een nieuw bestand.</p>
              </div>
            )}
          </div>

          <AlertDialogFooter className="items-center sm:justify-between">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploaden..." : "Nieuwe uploaden"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = "" }} />
            </label>
            <AlertDialogCancel>Sluiten</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
