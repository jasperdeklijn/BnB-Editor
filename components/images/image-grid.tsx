"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, ImageIcon, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UserImageAsset } from "@/lib/user-images"

interface ImageGridProps {
  images: UserImageAsset[]
  isLoading: boolean
  onDelete: (image: UserImageAsset) => Promise<void>
  onCopyUrl: (image: UserImageAsset) => Promise<void>
  onRename: (image: UserImageAsset, name: string) => Promise<boolean>
  formatBytes: (bytes: number) => string
}

export function ImageGrid({ images, isLoading, onDelete, onCopyUrl, onRename, formatBytes }: ImageGridProps) {
  const [deletingImage, setDeletingImage] = useState<string | null>(null)
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [editedName, setEditedName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)

  const handleDelete = async (image: UserImageAsset) => {
    setDeletingImage(image.originalPath)
    await onDelete(image)
    setDeletingImage(null)
  }

  const saveName = async (image: UserImageAsset) => {
    setIsRenaming(true)
    const saved = await onRename(image, editedName)
    setIsRenaming(false)
    if (saved) setEditingImage(null)
  }

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
  if (images.length === 0) return <div className="flex flex-col items-center justify-center py-12 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><ImageIcon className="h-8 w-8 text-primary" aria-hidden /></div><p className="mt-4 text-sm font-medium text-foreground">Nog geen afbeeldingen</p><p className="mt-1 text-xs text-muted-foreground">Upload je eerste afbeelding om te beginnen</p></div>

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {images.map((image) => (
        <div key={image.originalPath} className="overflow-hidden rounded-lg border border-border bg-muted">
          <div className="group relative aspect-square">
            <Image src={image.previewUrl} alt={image.name} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
            <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100 group-focus-within:bg-black/50 group-focus-within:opacity-100">
              <div className="flex justify-end">
                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => void handleDelete(image)} disabled={deletingImage === image.originalPath} aria-label={`${image.name} verwijderen`}>
                  {deletingImage === image.originalPath ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1">
                <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => void onCopyUrl(image)}>URL kopiëren</Button>
                <p className="truncate text-center text-xs text-white">{formatBytes(image.size)}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-card p-2">
            {editingImage === image.originalPath ? (
              <div className="flex items-center gap-1">
                <input value={editedName} onChange={(event) => setEditedName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveName(image); if (event.key === "Escape") setEditingImage(null) }} maxLength={120} autoFocus className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs" aria-label="Naam van afbeelding" />
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isRenaming} onClick={() => void saveName(image)} aria-label="Naam opslaan"><Check className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isRenaming} onClick={() => setEditingImage(null)} aria-label="Annuleren"><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-xs text-foreground hover:text-primary" onClick={() => { setEditingImage(image.originalPath); setEditedName(image.name) }} title="Naam wijzigen"><span className="truncate">{image.name}</span><Pencil className="h-3 w-3 shrink-0" /></button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
