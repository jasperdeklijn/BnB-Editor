"use client"

/**
 * useTouchDrag
 *
 * A lightweight helper that bridges HTML5 drag-and-drop semantics to touch events
 * so that the same drop zones work on both desktop (mouse) and mobile (touch).
 *
 * Usage:
 *   const { onTouchStart, onTouchMove, onTouchEnd } = useTouchDrag()
 *
 *   Pass these handlers to any element that should be draggable on touch.
 *   The hook fires synthetic CustomEvents ("touchdragstart", "touchdrop") so the
 *   canvas can listen for them and route to the existing DnD logic.
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

    // We'll fire the dragstart event on first meaningful move
    // Store label for ghost creation
    ;(e.currentTarget as HTMLElement).dataset.touchLabel = label ?? ""
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startPos.current) return

    const touch = e.touches[0]
    const dx = touch.clientX - startPos.current.x
    const dy = touch.clientY - startPos.current.y

    // Start drag after 6px threshold
    if (!isDragging.current && Math.hypot(dx, dy) < 6) return

    // Prevent page scroll while dragging
    e.preventDefault()

    if (!isDragging.current) {
      isDragging.current = true
      const label = (e.currentTarget as HTMLElement).dataset.touchLabel ?? "Section"

      // Create ghost element
      const ghost = document.createElement("div")
      ghost.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        background: var(--color-primary, #4f46e5);
        color: white;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        opacity: 0.92;
        transform: scale(1.05) translateY(-4px);
        white-space: nowrap;
      `
      ghost.textContent = label
      document.body.appendChild(ghost)
      ghostRef.current = ghost

      // Dispatch touchdragstart on document so canvas can track state
      document.dispatchEvent(
        new CustomEvent("touchdragstart", { detail: payload })
      )
    }

    if (ghostRef.current) {
      ghostRef.current.style.left = `${touch.clientX - 40}px`
      ghostRef.current.style.top = `${touch.clientY - 36}px`
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) {
      cleanup()
      return
    }

    const touch = e.changedTouches[0]

    // Find the element at the drop position (ignore the ghost)
    if (ghostRef.current) ghostRef.current.style.display = "none"
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    if (ghostRef.current) ghostRef.current.style.display = ""

    cleanup()

    if (!target) return

    // Fire custom drop event on the target element so canvas/drop zones pick it up
    const dropEvent = new CustomEvent("touchdrop", {
      bubbles: true,
      detail: {
        ...payload,
        clientX: touch.clientX,
        clientY: touch.clientY,
      },
    })
    target.dispatchEvent(dropEvent)

    // Dispatch touchdragend on document so canvas can reset state
    document.dispatchEvent(new CustomEvent("touchdragend"))
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
