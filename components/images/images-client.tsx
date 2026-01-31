"use client"

import { useState, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { ImageUploadZone } from "./image-upload-zone"
import { ImageGrid } from "./image-grid"
import { ArrowLeft } from "lucide-react"

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
      toast.error("Failed to load images")
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
      toast.error("Failed to load image URLs")
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
          toast.error(`${file.name} exceeds 5MB limit`)
          continue
        }

        // Check total usage
        if (totalUsage + file.size > MAX_TOTAL_SIZE) {
          toast.error("Upload would exceed your 50MB storage limit")
          break
        }

        // Check if file type is an image
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`)
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
          toast.error(`Failed to upload ${file.name}: ${error.message}`)
        } else {
          toast.success(`${file.name} uploaded successfully`)
          setTotalUsage((prev) => prev + file.size)
        }
      }

      await fetchImages()
    } catch {
      toast.error("An error occurred during upload")
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
      toast.error("Failed to delete image")
    } else {
      toast.success("Image deleted")
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
      toast.error("Failed to generate URL")
      return
    }
    
    navigator.clipboard.writeText(data.signedUrl)
    toast.success("URL copied to clipboard (valid for 7 days)")
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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">BnB Builder</h1>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">My Images</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/editor">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-8">
          {/* Storage Usage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Storage Usage</CardTitle>
              <CardDescription>
                {formatBytes(totalUsage)} of {formatBytes(MAX_TOTAL_SIZE)} used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Max 5MB per file, 50MB total
              </p>
            </CardContent>
          </Card>

          {/* Upload Zone */}
          <ImageUploadZone
            onUpload={handleUpload}
            isUploading={isUploading}
            disabled={totalUsage >= MAX_TOTAL_SIZE}
          />

          {/* Images Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Your Images</CardTitle>
              <CardDescription>
                Click an image to copy its URL for use in the editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageGrid
                images={images}
                isLoading={isLoading}
                onDelete={handleDelete}
                onCopyUrl={(fileName) => handleCopyUrl(fileName)}
                formatBytes={formatBytes}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
