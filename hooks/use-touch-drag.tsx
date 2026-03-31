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
      // Fade-out animation before removing
      const ghost = ghostRef.current
      ghost.style.transition = "opacity 180ms ease, transform 180ms ease"
      ghost.style.opacity = "0"
      ghost.style.transform = "scale(0.8)"
      setTimeout(() => {
        try { ghost.remove() } catch (_) { /* already removed */ }
      }, 180)
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

      const ghost = document.createElement("div")
      ghost.style.cssText = [
        "position:fixed",
        "z-index:9999",
        "pointer-events:none",
        "border-radius:12px",
        "box-shadow:0 12px 32px rgba(0,0,0,0.30)",
        "opacity:0",
        "transform:scale(0.85) translateY(0px)",
        "transition:opacity 180ms ease, transform 180ms ease",
        "overflow:hidden",
      ].join(";")

      if (payload.imageUrl) {
        // ── Image ghost: show a thumbnail of the actual image ──
        ghost.style.width = "90px"
        ghost.style.height = "68px"
        ghost.style.border = "2.5px solid rgba(255,255,255,0.85)"

        const img = document.createElement("img")
        img.src = payload.imageUrl
        img.crossOrigin = "anonymous"
        img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;border-radius:9px;"
        ghost.appendChild(img)

        // Badge overlay
        const badge = document.createElement("div")
        badge.style.cssText = [
          "position:absolute",
          "bottom:4px",
          "right:4px",
          "background:rgba(0,0,0,0.55)",
          "color:#fff",
          "font-size:10px",
          "font-weight:600",
          "padding:2px 5px",
          "border-radius:4px",
          "backdrop-filter:blur(4px)",
          "line-height:1.4",
        ].join(";")
        badge.textContent = "Drop on section"
        ghost.appendChild(badge)
      } else {
        // ── Section ghost: pill label ──
        ghost.style.cssText += [
          "background:var(--color-primary,#4f46e5)",
          "color:#fff",
          "padding:9px 16px",
          "font-size:13px",
          "font-weight:600",
          "white-space:nowrap",
        ].join(";")
        ghost.textContent = labelRef.current
      }

      document.body.appendChild(ghost)
      ghostRef.current = ghost

      // Animate in on next frame
      requestAnimationFrame(() => {
        if (!ghostRef.current) return
        ghostRef.current.style.opacity = payload.imageUrl ? "0.95" : "0.92"
        ghostRef.current.style.transform = "scale(1.05) translateY(-6px)"
      })

      document.dispatchEvent(
        new CustomEvent("touchdragstart", { detail: payload })
      )
    }

    if (ghostRef.current) {
      const g = ghostRef.current
      const offsetX = payload.imageUrl ? 45 : 40
      const offsetY = payload.imageUrl ? 50 : 36
      g.style.left = `${touch.clientX - offsetX}px`
      g.style.top  = `${touch.clientY - offsetY}px`
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
