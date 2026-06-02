import type { Section, Transition, TransitionType } from "@/lib/types"
import { DEFAULT_TRANSITION } from "./defaultTransitions"

export function resolveTransitionToNext(
  current: Section,
  next: Section | undefined,
  transitions: Transition[] = []
): Transition | null {
  if (!next) return null

  const transition = transitions.find(
    (item) => item.fromSectionId === current.id && item.toSectionId === next.id,
  )

  if (!transition || transition.type === DEFAULT_TRANSITION) return null

  return transition
}

export function resolveTransitionTypeToNext(
  current: Section,
  next: Section | undefined,
  transitions: Transition[] = []
): TransitionType {
  return resolveTransitionToNext(current, next, transitions)?.type ?? DEFAULT_TRANSITION
}
