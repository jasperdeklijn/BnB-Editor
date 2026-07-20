type SupabaseLikeError = {
  code?: string | null
  message?: string | null
}

/**
 * Postgres reports a missing relation as 42P01, while PostgREST can surface
 * the same rollout state as PGRST205 when its schema cache has no table yet.
 */
export function isMissingRelationError(error: SupabaseLikeError | null | undefined) {
  return error?.code === "42P01" || error?.code === "PGRST205"
}
