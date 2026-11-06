import type { TaskDefinition, TaskPriority, TaskStatus } from '../../types'

export interface TaskRecord<T = any> {
  definition: TaskDefinition<T>
  status: TaskStatus
  enqueuedAt: number
  startedAt?: number
  finishedAt?: number
  error?: Error
  result?: T
}

export class IdleTaskScheduler {
  private queue: TaskRecord[] = []
  private isProcessing = false
  private currentIdleHandle: number | null = null
  private currentTimerHandle: ReturnType<typeof setTimeout> | null = null
  private debug = false

  private readonly priorityWeights: Record<TaskPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    idle: 1,
  }

  constructor(options: { debug?: boolean } = {}) {
    this.debug = Boolean(options.debug)
  }

  /**
   * Enqueues a new background task prioritized by urgency.
   */
  public enqueue<T = any>(
    name: string,
    execute: () => Promise<T> | T,
    priority: TaskPriority = 'normal',
    timeoutMs?: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const definition: TaskDefinition<T> = {
        id,
        name,
        priority,
        timeoutMs,
        execute: async () => {
          try {
            const res = await execute()
            resolve(res)
            return res
          }
          catch (err) {
            reject(err)
            throw err
          }
        },
      }

      const record: TaskRecord<T> = {
        definition,
        status: 'pending',
        enqueuedAt: Date.now(),
      }

      this.queue.push(record)
      this.sortQueue()

      if (this.debug) {
        // eslint-disable-next-line no-console
        console.info(`[ProgressiveBoot] Enqueued "${name}" (priority: ${priority}, queue: ${this.queue.length})`)
      }

      this.scheduleProcessing()
    })
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const weightDiff = this.priorityWeights[b.definition.priority] - this.priorityWeights[a.definition.priority]
      if (weightDiff !== 0) return weightDiff
      return a.enqueuedAt - b.enqueuedAt
    })
  }

  private scheduleProcessing(): void {
    if (this.isProcessing || this.queue.length === 0) return

    const nextTask = this.queue[0]
    if (!nextTask) return

    if (nextTask.definition.priority === 'critical') {
      this.isProcessing = true
      queueMicrotask(async () => {
        try {
          while (this.queue.length > 0 && this.queue[0]?.definition.priority === 'critical') {
            await this.processNextTask()
          }
        }
        finally {
          this.isProcessing = false
          if (this.queue.length > 0) {
            this.scheduleProcessing()
          }
        }
      })
      return
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const timeout = nextTask.definition.timeoutMs ?? (nextTask.definition.priority === 'high' ? 1000 : 3000)
      this.currentIdleHandle = (window as Window).requestIdleCallback(
        (deadline) => {
          this.processWithDeadline(deadline)
        },
        { timeout },
      )
    }
    else {
      // Fallback for browsers/environments without requestIdleCallback
      const fallbackDelay = nextTask.definition.priority === 'high' ? 30 : 100
      this.currentTimerHandle = setTimeout(() => {
        this.currentTimerHandle = null
        const start = Date.now()
        this.processWithDeadline({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        })
      }, fallbackDelay)
    }
  }

  private async processWithDeadline(deadline: { didTimeout: boolean, timeRemaining: () => number }): Promise<void> {
    this.isProcessing = true
    this.currentIdleHandle = null
    this.currentTimerHandle = null

    try {
      while (this.queue.length > 0 && (deadline.timeRemaining() > 8 || deadline.didTimeout)) {
        await this.processNextTask()
        if (deadline.didTimeout) break
      }
    }
    finally {
      this.isProcessing = false
      if (this.queue.length > 0) {
        this.scheduleProcessing()
      }
    }
  }

  private async processNextTask(): Promise<void> {
    const record = this.queue.shift()
    if (!record) return

    record.status = 'running'
    record.startedAt = Date.now()

    try {
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.info(`[ProgressiveBoot] Running "${record.definition.name}"`)
      }
      record.result = await record.definition.execute()
      record.status = 'completed'
      record.finishedAt = Date.now()
    }
    catch (err) {
      record.status = 'failed'
      record.error = err instanceof Error ? err : new Error(String(err))
      record.finishedAt = Date.now()
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.warn(`[ProgressiveBoot] Task "${record.definition.name}" failed:`, err)
      }
    }
  }

  public get pendingCount(): number {
    return this.queue.length
  }

  public clear(): void {
    if (this.currentIdleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
      (window as Window).cancelIdleCallback(this.currentIdleHandle)
      this.currentIdleHandle = null
    }
    if (this.currentTimerHandle !== null) {
      clearTimeout(this.currentTimerHandle)
      this.currentTimerHandle = null
    }
    this.queue = []
    this.isProcessing = false
  }
}
