"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  isPreview: boolean
  className?: string
  as?: "h1" | "h2" | "h3" | "p" | "span"
  placeholder?: string
  style?: React.CSSProperties
}

export function EditableText({
  value,
  onChange,
  isPreview,
  className,
  as: Component = "p",
  placeholder = "Click to edit",
  style,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (!isPreview) {
      setIsEditing(true)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (localValue !== value) {
      onChange(localValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === "Escape") {
      setLocalValue(value)
      setIsEditing(false)
    }
  }

  if (isPreview) {
    return (
      <Component className={className} style={style}>
        {value}
      </Component>
    )
  }

  if (isEditing) {
    const isMultiline = Component === "p" || value.length > 50

    if (isMultiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn("w-full resize-none rounded border-2 border-primary bg-background px-2 py-1", className)}
          style={style}
          rows={3}
        />
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("w-full rounded border-2 border-primary bg-background px-2 py-1", className)}
        style={style}
      />
    )
  }

  return (
    <Component
      onClick={handleClick}
      className={cn(
        "cursor-pointer rounded transition-colors hover:bg-accent/50",
        !value && "text-muted-foreground",
        className,
      )}
      style={style}
    >
      {value || placeholder}
    </Component>
  )
}
