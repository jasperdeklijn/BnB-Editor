"use client"

import { useCallback, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface ImageUploadZoneProps {
  onUpload: (files: File[]) => void
  isUploading: boolean
  disabled: boolean
}

export function ImageUploadZone({ onUpload, isUploading, disabled }: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || isUploading) return

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      )

      if (files.length > 0) {
        onUpload(files)
      }
    },
    [disabled, isUploading, onUpload]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onUpload(Array.from(files))
      }
      e.target.value = ""
    },
    [onUpload]
  )

  return (
    <Card
      className={`transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="py-10">
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center gap-3 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isUploading
                ? "Uploading..."
                : disabled
                ? "Storage limit reached"
                : "Drop images here or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG, GIF, WEBP up to 5MB each
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
          />
        </label>
      </CardContent>
    </Card>
  )
}
