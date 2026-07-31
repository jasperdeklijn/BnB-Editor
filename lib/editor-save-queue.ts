export type EditorSaveTask = () => Promise<void>

interface EditorSaveQueueOptions {
  delay?: number
  onPendingChange?: (pending: boolean) => void
  onError?: (error: unknown) => void
}

/**
 * Keeps only the latest pending save per key, serialises saves for that key,
 * and can flush every queued change before navigation or publication.
 */
export class EditorSaveQueue {
  private readonly delay: number
  private readonly onPendingChange?: (pending: boolean) => void
  private readonly onError?: (error: unknown) => void
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly tasks = new Map<string, EditorSaveTask>()
  private readonly failedTasks = new Map<string, EditorSaveTask>()
  private readonly chains = new Map<string, Promise<void>>()
  private active = 0
  private pendingState = false

  constructor(options: EditorSaveQueueOptions = {}) {
    this.delay = options.delay ?? 800
    this.onPendingChange = options.onPendingChange
    this.onError = options.onError
  }

  get pending() {
    return this.tasks.size > 0 || this.active > 0
  }

  schedule(key: string, task: EditorSaveTask) {
    const existingTimer = this.timers.get(key)
    if (existingTimer) clearTimeout(existingTimer)

    this.tasks.set(key, task)
    this.failedTasks.delete(key)
    this.emitPendingState()
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key)
      void this.run(key)
    }, this.delay))
  }

  async flush() {
    const keys = [...new Set([...this.tasks.keys(), ...this.failedTasks.keys()])]
    keys.forEach((key) => {
      const timer = this.timers.get(key)
      if (timer) clearTimeout(timer)
      this.timers.delete(key)
    })

    const started = keys.map((key) => this.run(key))
    const existing = [...this.chains.values()]
    const results = await Promise.allSettled([...started, ...existing])
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected")
    if (failure) throw failure.reason
  }

  clear() {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
    this.tasks.clear()
    this.failedTasks.clear()
    this.emitPendingState()
  }

  private run(key: string) {
    const task = this.tasks.get(key) ?? this.failedTasks.get(key)
    if (!task) return this.chains.get(key) ?? Promise.resolve()

    this.tasks.delete(key)
    this.failedTasks.delete(key)
    const previous = this.chains.get(key) ?? Promise.resolve()
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        this.active += 1
        this.emitPendingState()
        try {
          await task()
        } catch (error) {
          this.failedTasks.set(key, task)
          this.onError?.(error)
          throw error
        } finally {
          this.active -= 1
          this.emitPendingState()
        }
      })

    this.chains.set(key, next)
    void next.finally(() => {
      if (this.chains.get(key) === next) this.chains.delete(key)
    }).catch(() => undefined)
    return next
  }

  private emitPendingState() {
    const next = this.pending
    if (next === this.pendingState) return
    this.pendingState = next
    this.onPendingChange?.(next)
  }
}
