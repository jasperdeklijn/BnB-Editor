"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface UserImage {
  name: string
  url: string
  size: number
  createdAt: string
}

interface ImageGridProps {
  images: UserImage[]
  isLoading: boolean
  onDelete: (fileName: string) => void
  onCopyUrl: (fileName: string) => void
  formatBytes: (bytes: number) => string
}

export function ImageGrid({
  images,
  isLoading,
  onDelete,
  onCopyUrl,
  formatBytes,
}: ImageGridProps) {
  const [deletingImage, setDeletingImage] = useState<string | null>(null)

  const handleDelete = async (fileName: string) => {
    setDeletingImage(fileName)
    await onDelete(fileName)
    setDeletingImage(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">No images yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload your first image to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {images.map((image) => (
        <div
          key={image.name}
          className="group relative overflow-hidden rounded-lg border border-border bg-muted"
        >
          <div className="aspect-square">
            <Image
              src={image.url}
              alt={image.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleDelete(image.name)}
                disabled={deletingImage === image.name}
              >
                {deletingImage === image.name ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </Button>
            </div>
            
            <div className="space-y-1">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => onCopyUrl(image.name)}
              >
                Copy URL
              </Button>
              <p className="truncate text-center text-xs text-white">
                {formatBytes(image.size)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
