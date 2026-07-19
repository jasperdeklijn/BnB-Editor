"use client"

import { useCallback, useEffect, useState } from "react"
import { HardDrive, ImageIcon, Upload as UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { EditorPageShell } from "@/components/editor/editor-page-shell"
import { useEditorLayout } from "@/components/editor/editor-layout-context"
import { createClient } from "@/lib/supabase/client"
import {
  createCroppedImagePreview,
  loadUserImages,
  USER_IMAGES_BUCKET,
  type UserImageAsset,
} from "@/lib/user-images"
import { ImageGrid } from "./image-grid"
import { ImageUploadZone } from "./image-upload-zone"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TOTAL_SIZE = 50 * 1024 * 1024

interface ImagesClientProps {
  userId: string
}

export function ImagesClient({ userId }: ImagesClientProps) {
  const [images, setImages] = useState<UserImageAsset[]>([])
  const [totalUsage, setTotalUsage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const { setIsSaving, setSaveState } = useEditorLayout()

  const fetchImages = useCallback(async () => {
    const supabase = createClient()
    try {
      const imageList = await loadUserImages(supabase, userId)
      setImages(imageList)
      setTotalUsage(imageList.reduce((sum, image) => sum + image.storageSize, 0))
    } catch {
      toast.error("Mislukt om afbeeldingen te laden")
      setImages([])
      setTotalUsage(0)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void fetchImages()
  }, [fetchImages])

  const handleUpload = async (files: File[]) => {
    const supabase = createClient()
    setIsUploading(true)
    setIsSaving(true)
    let failed = false
    let runningUsage = totalUsage

    try {
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          failed = true
          toast.error(`${file.name} overschrijdt de limiet van 5 MB`)
          continue
        }
        if (!file.type.startsWith("image/")) {
          failed = true
          toast.error(`${file.name} is geen afbeelding`)
          continue
        }

        let preview: Blob
        try {
          preview = await createCroppedImagePreview(file)
        } catch {
          failed = true
          toast.error(`${file.name} kon niet als afbeelding worden verwerkt`)
          continue
        }

        if (runningUsage + file.size + preview.size > MAX_TOTAL_SIZE) {
          failed = true
          toast.error("Upload zou je opslaglimiet van 50 MB overschrijden")
          break
        }

        const imageId = crypto.randomUUID()
        const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin"
        const originalPath = `${userId}/originals/${imageId}.${extension}`
        const thumbnailPath = `${userId}/thumbnails/${imageId}.webp`
        const { error: originalError } = await supabase.storage
          .from(USER_IMAGES_BUCKET)
          .upload(originalPath, file, { cacheControl: "31536000", upsert: false })

        if (originalError) {
          failed = true
          toast.error(`Mislukt om ${file.name} te uploaden: ${originalError.message}`)
          continue
        }

        const { error: thumbnailError } = await supabase.storage
          .from(USER_IMAGES_BUCKET)
          .upload(thumbnailPath, preview, { contentType: "image/webp", cacheControl: "31536000", upsert: false })

        if (thumbnailError) {
          await supabase.storage.from(USER_IMAGES_BUCKET).remove([originalPath])
          failed = true
          toast.error(`Mislukt om een snel voorbeeld voor ${file.name} te bewaren`)
          continue
        }

        const { error: metadataError } = await supabase.from("user_images").insert({
          id: imageId,
          user_id: userId,
          display_name: file.name,
          original_path: originalPath,
          thumbnail_path: thumbnailPath,
          original_size: file.size,
          thumbnail_size: preview.size,
        })

        if (metadataError) {
          await supabase.storage.from(USER_IMAGES_BUCKET).remove([originalPath, thumbnailPath])
          failed = true
          toast.error(`Mislukt om ${file.name} aan de bibliotheek toe te voegen`)
          continue
        }

        runningUsage += file.size + preview.size
        toast.success(`${file.name} succesvol geüpload`)
      }

      await fetchImages()
    } catch {
      failed = true
      toast.error("Er is een fout opgetreden tijdens het uploaden")
    } finally {
      setIsUploading(false)
      setIsSaving(false)
      if (failed) setSaveState("error")
    }
  }

  const handleDelete = async (image: UserImageAsset) => {
    const supabase = createClient()
    setIsSaving(true)
    const paths = [image.originalPath, image.thumbnailPath].filter((path): path is string => Boolean(path))
    const { error } = await supabase.storage.from(USER_IMAGES_BUCKET).remove(paths)

    if (error) {
      setSaveState("error")
      toast.error("Mislukt om afbeelding te verwijderen")
    } else {
      if (image.id) {
        const { error: metadataError } = await supabase.from("user_images").delete().eq("id", image.id).eq("user_id", userId)
        if (metadataError) {
          setSaveState("error")
          toast.error("Afbeeldingsgegevens konden niet worden verwijderd")
          setIsSaving(false)
          return
        }
      }
      toast.success("Afbeelding verwijderd")
      await fetchImages()
    }
    setIsSaving(false)
  }

  const handleCopyUrl = async (image: UserImageAsset) => {
    await navigator.clipboard.writeText(image.url)
    toast.success("URL gekopieerd naar klembord")
  }

  const handleRename = async (image: UserImageAsset, name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length > 120) {
      toast.error("Gebruik een naam van 1 tot 120 tekens")
      return false
    }

    const supabase = createClient()
    setIsSaving(true)
    const operation = image.id
      ? supabase.from("user_images").update({ display_name: trimmedName }).eq("id", image.id).eq("user_id", userId)
      : supabase.from("user_images").insert({
          user_id: userId,
          display_name: trimmedName,
          original_path: image.originalPath,
          thumbnail_path: null,
          original_size: image.size,
          thumbnail_size: 0,
        })
    const { error } = await operation
    setIsSaving(false)

    if (error) {
      setSaveState("error")
      toast.error("Naam kon niet worden gewijzigd")
      return false
    }

    await fetchImages()
    toast.success("Naam gewijzigd")
    return true
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const usagePercentage = (totalUsage / MAX_TOTAL_SIZE) * 100

  return (
    <EditorPageShell title="Afbeeldingen" description="Upload en beheer afbeeldingen voor je website en editorsecties." maxWidth="4xl">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 rounded-t-xl border-b border-border bg-secondary/40 px-6 py-4">
          <div className="rounded-md bg-primary/15 p-1.5 text-primary"><HardDrive className="h-4 w-4" /></div>
          <div>
            <h2 className="font-semibold text-foreground">Opslaggebruik</h2>
            <p className="text-xs text-muted-foreground">{formatBytes(totalUsage)} van {formatBytes(MAX_TOTAL_SIZE)} gebruikt</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(usagePercentage, 100)}%` }} /></div>
          <p className="mt-2 text-xs text-muted-foreground">Max. 5 MB per bestand · 50 MB totaal, inclusief snelle voorbeelden</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 rounded-t-xl border-b border-border bg-secondary/40 px-6 py-4">
          <div className="rounded-md bg-primary/15 p-1.5 text-primary"><UploadIcon className="h-4 w-4" /></div>
          <div><h2 className="font-semibold text-foreground">Afbeeldingen uploaden</h2><p className="text-xs text-muted-foreground">PNG, JPG, GIF of WEBP tot 5 MB per afbeelding</p></div>
        </div>
        <div className="p-6"><ImageUploadZone onUpload={handleUpload} isUploading={isUploading} disabled={totalUsage >= MAX_TOTAL_SIZE} /></div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 rounded-t-xl border-b border-border bg-secondary/40 px-6 py-4">
          <div className="rounded-md bg-primary/15 p-1.5 text-primary"><ImageIcon className="h-4 w-4" /></div>
          <div><h2 className="font-semibold text-foreground">Jouw afbeeldingen</h2><p className="text-xs text-muted-foreground">Wijzig een naam of kopieer de originele URL voor gebruik in je website</p></div>
        </div>
        <div className="p-6"><ImageGrid images={images} isLoading={isLoading} onDelete={handleDelete} onCopyUrl={handleCopyUrl} onRename={handleRename} formatBytes={formatBytes} /></div>
      </div>
    </EditorPageShell>
  )
}
