import type { Section, SectionTransition } from "@/lib/types"
import {
  DEFAULT_TRANSITION,
} from "./defaultTransitions"

export function resolveTransitionToNext(
  current: Section,
  next?: Section
): SectionTransition {
  if (!next) return { type: "none" }

  // Explicit transition always wins
  if (current.transitionToNext) {
    return current.transitionToNext
  }

  return { type: DEFAULT_TRANSITION }
}
