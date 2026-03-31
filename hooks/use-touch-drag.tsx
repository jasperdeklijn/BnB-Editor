"use client"

/**
 * useTouchDrag
 *
 * Bridges HTML5 drag-and-drop semantics to touch events so the same drop zones
 * work on both desktop (mouse) and mobile (touch).
 *
 * Fires three CustomEvents on `document`:
 *   "touchdragstart"     — drag threshold crossed, payload in detail
 *   "touchdragmove"      — fires every frame during drag with { clientX, clientY }
 *   "touchdragend"       — finger lifted (regardless of drop)
 *   "touchdrop"          — fired on the element under the finger at release,
 *                          bubbles up so canvas listeners can catch it
 */

import { useRef } from "react"

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

  const cleanup = () => {
    if (ghostRef.current) {
      ghostRef.current.remove()
      ghostRef.current = null
    }
    isDragging.current = false
    startPos.current = null
  }

  const onTouchStart = (e: React.TouchEvent, label?: string) => {
    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
    isDragging.current = false
    labelRef.current = label ?? "Section"
    // Do NOT call preventDefault here — allow normal tap/scroll recognition
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startPos.current) return

    const touch = e.touches[0]
    const dx = touch.clientX - startPos.current.x
    const dy = touch.clientY - startPos.current.y

    // Only start dragging after a 10px threshold
    if (!isDragging.current && Math.hypot(dx, dy) < 10) return

    // We're dragging — prevent page scroll
    e.preventDefault()

    if (!isDragging.current) {
      isDragging.current = true

      // Create ghost label that follows the finger
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

      document.dispatchEvent(
        new CustomEvent("touchdragstart", { detail: payload })
      )
    }

    if (ghostRef.current) {
      const g = ghostRef.current
      g.style.left = `${touch.clientX - 40}px`
      g.style.top  = `${touch.clientY - 36}px`
    }

    // Emit a move event so the canvas can track hover drop index
    document.dispatchEvent(
      new CustomEvent("touchdragmove", {
        detail: {
          ...payload,
          clientX: touch.clientX,
          clientY: touch.clientY,
        },
      })
    )
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) {
      cleanup()
      return
    }

    const touch = e.changedTouches[0]

    // Temporarily hide ghost so elementFromPoint lands on the real target
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
      })
    )
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
