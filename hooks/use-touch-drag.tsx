"use client"

/**
 * useTouchDrag
 *
 * Bridges HTML5 drag-and-drop semantics to touch events so the same drop zones
 * work on both desktop (mouse) and mobile (touch).
 *
 * Fires three CustomEvents on `document`:
 *   "touchdragstart" - drag threshold crossed, payload in detail
 *   "touchdragend"   - finger lifted (regardless of drop)
 *   "touchdrop"      - fired on the element under the finger at release,
 *                      bubbles up so canvas listeners can catch it
 */

import { useRef } from "react"
import type { TouchEvent as ReactTouchEvent } from "react"

export interface TouchDragPayload {
  sectionType?: string
  imageUrl?: string
  sectionIndex?: number
}

interface UseTouchDragOptions {
  payload: TouchDragPayload
}

export function useTouchDrag({ payload }: UseTouchDragOptions) {
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const labelRef = useRef<string>("")
  const removeDocumentListenersRef = useRef<(() => void) | null>(null)

  const cleanup = () => {
    if (ghostRef.current) {
      ghostRef.current.remove()
      ghostRef.current = null
    }
    removeDocumentListenersRef.current?.()
    removeDocumentListenersRef.current = null
    isDragging.current = false
    startPos.current = null
  }

  const onTouchMove = (e: TouchEvent | ReactTouchEvent) => {
    if (!startPos.current) return

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - startPos.current.x
    const dy = touch.clientY - startPos.current.y

    if (!isDragging.current && Math.hypot(dx, dy) < 10) return

    e.preventDefault()

    if (!isDragging.current) {
      isDragging.current = true

      const ghost = document.createElement("div")
      ghost.style.cssText = [
        "position:fixed",
        "z-index:9999",
        "pointer-events:none",
        "background:var(--color-primary,#4f46e5)",
        "color:#fff",
        "padding:8px 14px",
        "border-radius:8px",
        "font-size:13px",
        "font-weight:600",
        "box-shadow:0 8px 24px rgba(0,0,0,0.25)",
        "opacity:0.92",
        "white-space:nowrap",
        "transform:scale(1.05) translateY(-4px)",
      ].join(";")
      ghost.textContent = labelRef.current
      document.body.appendChild(ghost)
      ghostRef.current = ghost

      document.dispatchEvent(new CustomEvent("touchdragstart", { detail: payload }))
    }

    if (ghostRef.current) {
      ghostRef.current.style.left = `${touch.clientX - 40}px`
      ghostRef.current.style.top = `${touch.clientY - 36}px`
    }
  }

  const onTouchEnd = (e: TouchEvent | ReactTouchEvent) => {
    if (!isDragging.current) {
      cleanup()
      return
    }

    const touch = e.changedTouches[0]
    if (!touch) {
      cleanup()
      return
    }

    if (ghostRef.current) ghostRef.current.style.display = "none"
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    if (ghostRef.current) ghostRef.current.style.display = ""

    cleanup()

    document.dispatchEvent(new CustomEvent("touchdragend"))

    if (!target) return

    target.dispatchEvent(
      new CustomEvent("touchdrop", {
        bubbles: true,
        detail: {
          ...payload,
          clientX: touch.clientX,
          clientY: touch.clientY,
        },
      }),
    )
  }

  const onTouchStart = (e: ReactTouchEvent, label?: string) => {
    const touch = e.touches[0]
    if (!touch) return

    cleanup()
    startPos.current = { x: touch.clientX, y: touch.clientY }
    isDragging.current = false
    labelRef.current = label ?? "Section"

    const handleDocumentTouchMove = (event: TouchEvent) => onTouchMove(event)
    const handleDocumentTouchEnd = (event: TouchEvent) => onTouchEnd(event)

    document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false })
    document.addEventListener("touchend", handleDocumentTouchEnd)
    document.addEventListener("touchcancel", handleDocumentTouchEnd)
    removeDocumentListenersRef.current = () => {
      document.removeEventListener("touchmove", handleDocumentTouchMove)
      document.removeEventListener("touchend", handleDocumentTouchEnd)
      document.removeEventListener("touchcancel", handleDocumentTouchEnd)
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
