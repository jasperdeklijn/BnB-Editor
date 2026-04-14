"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { ImageUploadZone } from "./image-upload-zone"
import { ImageGrid } from "./image-grid"
import { ArrowLeft, ImageIcon, HardDrive, Upload as UploadIcon } from "lucide-react"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB
const BUCKET_NAME = "user-images"

interface UserImage {
  name: string
  url: string
  size: number
  createdAt: string
}

interface ImagesClientProps {
  userId: string
}

export function ImagesClient({ userId }: ImagesClientProps) {
  const [images, setImages] = useState<UserImage[]>([])
  const [totalUsage, setTotalUsage] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  const fetchImages = useCallback(async () => {
    const supabase = createClient()
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      })

    if (error) {
      toast.error("Mislukt om afbeeldingen te laden")
      setIsLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setImages([])
      setTotalUsage(0)
      setIsLoading(false)
      return
    }

    const imageList: UserImage[] = []
    let usage = 0

    // Filter out placeholder files
    const validFiles = data.filter(file => file.name !== ".emptyFolderPlaceholder")
    
    if (validFiles.length === 0) {
      setImages([])
      setTotalUsage(0)
      setIsLoading(false)
      return
    }

    // Get signed URLs for all images (valid for 1 hour)
    const { data: signedUrls, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrls(
        validFiles.map(file => `${userId}/${file.name}`),
        3600 // 1 hour expiry
      )

    if (signedUrlError) {
      toast.error("Mislukt om afbeelding-URLs te laden")
      setIsLoading(false)
      return
    }

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const signedUrl = signedUrls?.[i]?.signedUrl

      if (signedUrl) {
        imageList.push({
          name: file.name,
          url: signedUrl,
          size: file.metadata?.size || 0,
          createdAt: file.created_at || "",
        })
      }
      
      usage += file.metadata?.size || 0
    }

    setImages(imageList)
    setTotalUsage(usage)
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleUpload = async (files: File[]) => {
    const supabase = createClient()
    setIsUploading(true)

    try {
      for (const file of files) {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} overschrijdt 5MB limiet`)
          continue
        }

        // Check total usage
        if (totalUsage + file.size > MAX_TOTAL_SIZE) {
          toast.error("Upload zou je 50MB opslaglimiet overschrijden")
          break
        }

        // Check if file type is an image
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is geen afbeelding`)
          continue
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const filePath = `${userId}/${fileName}`

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (error) {
          toast.error(`Mislukt om ${file.name} te uploaden: ${error.message}`)
        } else {
          toast.success(`${file.name} succesvol geüpload`)
          setTotalUsage((prev) => prev + file.size)
        }
      }

      await fetchImages()
    } catch {
      toast.error("Er is een fout opgetreden tijdens het uploaden")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (fileName: string) => {
    const supabase = createClient()
    const filePath = `${userId}/${fileName}`

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      toast.error("Mislukt om afbeelding te verwijderen")
    } else {
      toast.success("Afbeelding verwijderd")
      await fetchImages()
    }
  }

  const handleCopyUrl = async (fileName: string) => {
    const supabase = createClient()
    
    // Generate a long-lasting signed URL (7 days) for use in the editor
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(`${userId}/${fileName}`, 60 * 60 * 24 * 7) // 7 days
    
    if (error || !data?.signedUrl) {
      toast.error("Mislukt om URL te genereren")
      return
    }
    
    navigator.clipboard.writeText(data.signedUrl)
    toast.success("URL gekopieerd naar klembord (geldig voor 7 dagen)")
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
    <div className="min-h-screen bg-background">
      {/* Top bar — matches profile/bnb/rooms header style */}
      <header className="flex items-center gap-4 border-b border-border bg-[var(--editor-header)] px-4 py-3 md:px-8">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-[var(--editor-header-fg)]/80 hover:bg-[var(--editor-header-fg)]/10 hover:text-[var(--editor-header-fg)]"
        >
          <Link href="/editor">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Editor
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[var(--editor-header-fg)]" />
          <h1 className="text-lg font-semibold text-[var(--editor-header-fg)]">Mijn Afbeeldingen</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
        <div className="flex flex-col gap-6">

          {/* Storage Usage card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
              <div className="rounded-md bg-primary/15 p-1.5 text-primary">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Opslaggebruik</h2>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(totalUsage)} van {formatBytes(MAX_TOTAL_SIZE)} gebruikt
                </p>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Max 5 MB per bestand · 50 MB totaal
              </p>
            </div>
          </div>

          {/* Upload Zone card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
              <div className="rounded-md bg-primary/15 p-1.5 text-primary">
                <UploadIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Afbeeldingen uploaden</h2>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP tot 5 MB elk</p>
              </div>
            </div>
            <div className="p-6">
              <ImageUploadZone
                onUpload={handleUpload}
                isUploading={isUploading}
                disabled={totalUsage >= MAX_TOTAL_SIZE}
              />
            </div>
          </div>

          {/* Images Grid card */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-secondary/40 rounded-t-xl">
              <div className="rounded-md bg-primary/15 p-1.5 text-primary">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Jouw Afbeeldingen</h2>
                <p className="text-xs text-muted-foreground">
                  Klik op een afbeelding om de URL te kopiëren voor gebruik in de editor
                </p>
              </div>
            </div>
            <div className="p-6">
              <ImageGrid
                images={images}
                isLoading={isLoading}
                onDelete={handleDelete}
                onCopyUrl={(fileName) => handleCopyUrl(fileName)}
                formatBytes={formatBytes}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
