import { describe, it, expect, vi } from 'vitest'
import { IdleTaskScheduler } from '../src/runtime/core/scheduler'
import { ChunkCacheRegistry } from '../src/runtime/core/registry'

describe('IdleTaskScheduler', () => {
  it('enqueues and executes tasks with priority order', async () => {
    const scheduler = new IdleTaskScheduler()
    const executionOrder: string[] = []

    const p1 = scheduler.enqueue('task-normal', () => {
      executionOrder.push('normal')
      return 1
    }, 'normal')

    const p2 = scheduler.enqueue('task-critical', () => {
      executionOrder.push('critical')
      return 2
    }, 'critical')

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe(1)
    expect(r2).toBe(2)
    expect(executionOrder).toEqual(['critical', 'normal'])
  })

  it('isolates task errors without breaking subsequent tasks', async () => {
    const scheduler = new IdleTaskScheduler()

    const failingTask = scheduler.enqueue('failing', () => {
      throw new Error('boom')
    }, 'critical')

    const succeedingTask = scheduler.enqueue('succeeding', () => 'ok', 'critical')

    await expect(failingTask).rejects.toThrow('boom')
    const result = await succeedingTask
    expect(result).toBe('ok')
  })

  it('cancels pending queue and fallback timers on clear', () => {
    const scheduler = new IdleTaskScheduler()
    let executed = false

    scheduler.enqueue('pending-task', () => {
      executed = true
    }, 'idle')

    expect(scheduler.pendingCount).toBe(1)
    scheduler.clear()

    expect(scheduler.pendingCount).toBe(0)
    expect(executed).toBe(false)
  })
})

describe('ChunkCacheRegistry', () => {
  it('tracks pending, loaded and failed chunks correctly', () => {
    const registry = new ChunkCacheRegistry()

    expect(registry.isLoaded('/radar')).toBe(false)
    expect(registry.isPending('/radar')).toBe(false)

    registry.markPending('/radar')
    expect(registry.isPending('/radar')).toBe(true)
    expect(registry.isLoaded('/radar')).toBe(false)

    registry.markLoaded('/radar', 42)
    expect(registry.isPending('/radar')).toBe(false)
    expect(registry.isLoaded('/radar')).toBe(true)
    expect(registry.get('/radar')?.durationMs).toBe(42)

    registry.markFailed('/categorias', 'Network error')
    expect(registry.get('/categorias')?.status).toBe('failed')
    expect(registry.get('/categorias')?.error).toBe('Network error')
  })
})

