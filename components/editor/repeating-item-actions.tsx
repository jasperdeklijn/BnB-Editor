"use client"

import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RepeatingItemActionsProps {
  itemLabel: string
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function RepeatingItemActions({
  itemLabel,
  index,
  count,
  onMove,
  onDuplicate,
  onDelete,
}: RepeatingItemActionsProps) {
  return (
    <div className="flex items-center gap-1" aria-label={`Acties voor ${itemLabel}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={index === 0}
        aria-label={`${itemLabel} omhoog verplaatsen`}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={index === count - 1}
        aria-label={`${itemLabel} omlaag verplaatsen`}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`${itemLabel} dupliceren`} onClick={onDuplicate}>
        <Copy />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`${itemLabel} verwijderen`} onClick={onDelete}>
        <Trash2 />
      </Button>
    </div>
  )
}

export function moveRepeatingItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= items.length) return items
  const next = [...items]
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  return next
}
