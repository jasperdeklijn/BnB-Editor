"use client"

import { createContext, useContext } from "react"

export type EditorHeaderState = {
  title: string
  setTitle: (title: string) => void
  isPreview: boolean
  setIsPreview: (value: boolean) => void
  isSaving: boolean
  setIsSaving: (value: boolean) => void
  device: "desktop" | "tablet" | "mobile"
  setDevice: (device: "desktop" | "tablet" | "mobile") => void
  onPublish: () => void
  setOnPublish: (callback: () => void) => void
  onLogout: () => void
  setOnLogout: (callback: () => void) => void
  actionLabel?: string
  onAction?: (() => void) | undefined
  actionIcon?: React.ReactNode
  actionLoading: boolean
  setActionLabel: (label?: string) => void
  setOnAction: (callback?: (() => void) | undefined) => void
  setActionIcon: (icon?: React.ReactNode) => void
  setActionLoading: (value: boolean) => void
  infoText?: string
  setInfoText: (text?: string) => void
}

const EditorLayoutContext = createContext<EditorHeaderState | null>(null)

export function useEditorLayout() {
  const context = useContext(EditorLayoutContext)
  if (!context) {
    throw new Error("useEditorLayout must be used within EditorLayoutProvider")
  }
  return context
}

export function EditorLayoutProvider({
  value,
  children,
}: {
  value: EditorHeaderState
  children: React.ReactNode
}) {
  return <EditorLayoutContext.Provider value={value}>{children}</EditorLayoutContext.Provider>
}
