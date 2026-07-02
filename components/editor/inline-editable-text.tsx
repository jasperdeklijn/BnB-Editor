"use client"

import React, { useEffect, useRef, useState } from "react"

export type EditablePath = Array<string | number>

type EditableTag = "span" | "p" | "h1" | "h2" | "h3" | "h4"

interface EditableTextProps {
  as?: EditableTag
  data: Record<string, unknown>
  path: EditablePath
  value?: string | number | null
  fallback?: string
  isPreview: boolean
  onUpdate?: (newData: Record<string, unknown>) => void
  className?: string
  style?: React.CSSProperties
  multiline?: boolean
}

function cloneWithPath(source: unknown, path: EditablePath, value: string): unknown {
  if (path.length === 0) return value

  const [key, ...rest] = path
  const base = Array.isArray(source)
    ? [...source]
    : source && typeof source === "object"
      ? { ...(source as Record<string, unknown>) }
      : typeof key === "number"
        ? []
        : {}

  if (Array.isArray(base) && typeof key === "number") {
    base[key] = cloneWithPath(base[key], rest, value)
    return base
  }

  const objectBase = base as Record<string, unknown>
  objectBase[String(key)] = cloneWithPath(objectBase[String(key)], rest, value)
  return objectBase
}

function textFromNode(node: HTMLElement, multiline: boolean) {
  const text = multiline ? node.innerText : node.textContent
  return (text ?? "").trim()
}

export function EditableText({
  as = "span",
  data,
  path,
  value,
  fallback = "",
  isPreview,
  onUpdate,
  className,
  style,
  multiline = false,
}: EditableTextProps) {
  const editable = !isPreview && Boolean(onUpdate)
  const [isEditing, setIsEditing] = useState(false)
  const ref = useRef<HTMLElement | null>(null)
  const displayValue = String(value ?? fallback)

  useEffect(() => {
    if (!isEditing || !ref.current) return

    const element = ref.current
    element.focus()

    const selection = window.getSelection()
    if (!selection) return

    const range = document.createRange()
    range.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(range)
  }, [isEditing])

  const commit = () => {
    if (!isEditing || !ref.current || !onUpdate) return
    const nextValue = textFromNode(ref.current, multiline)
    setIsEditing(false)

    if (nextValue === displayValue) return
    onUpdate(cloneWithPath(data, path, nextValue) as Record<string, unknown>)
  }

  const cancel = () => {
    if (ref.current) ref.current.textContent = displayValue
    setIsEditing(false)
  }

  return React.createElement(
    as,
    {
      ref,
      className: `${className ?? ""} ${editable ? "cursor-text" : ""} ${
        isEditing ? "rounded outline outline-2 outline-primary/60 outline-offset-2" : ""
      }`,
      style,
      contentEditable: isEditing,
      suppressContentEditableWarning: true,
      title: editable ? "Dubbelklik om tekst te bewerken" : undefined,
      onDoubleClick: editable
        ? (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault()
            event.stopPropagation()
            setIsEditing(true)
          }
        : undefined,
      onClick: editable
        ? (event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault()
            event.stopPropagation()
          }
        : undefined,
      onBlur: commit,
      onKeyDown: isEditing
        ? (event: React.KeyboardEvent<HTMLElement>) => {
            event.stopPropagation()
            if (event.key === "Escape") {
              event.preventDefault()
              cancel()
            }
            if (event.key === "Enter" && !multiline) {
              event.preventDefault()
              commit()
            }
          }
        : undefined,
    },
    displayValue,
  )
}
