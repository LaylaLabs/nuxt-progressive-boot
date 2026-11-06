import { useNuxtApp, preloadRouteComponents } from '#app'
import { readonly } from 'vue'
import type { TaskPriority, ChunkCacheEntry } from '../../types'
import type { IdleTaskScheduler } from '../core/scheduler'
import type { ChunkCacheRegistry } from '../core/registry'

export function useProgressiveLoader() {
  const nuxtApp = useNuxtApp()
  const bootContext = nuxtApp.$progressiveBoot as {
    scheduler: IdleTaskScheduler
    registry: ChunkCacheRegistry
    dismissSplash: () => Promise<void>
    isDismissed: any
  } | undefined

  /**
   * Enqueues a task on the idle scheduler with a given priority.
   */
  async function scheduleTask<T = any>(
    name: string,
    execute: () => Promise<T> | T,
    priority: TaskPriority = 'normal',
    timeoutMs?: number,
  ): Promise<T> {
    if (!bootContext?.scheduler) {
      return execute()
    }
    return bootContext.scheduler.enqueue(name, execute, priority, timeoutMs)
  }

  /**
   * Preloads a specific route components during CPU idle time, with deduplication.
   */
  async function prefetchRoute(path: string, priority: TaskPriority = 'idle'): Promise<void> {
    if (!bootContext) return
    const { registry, scheduler } = bootContext

    if (registry.isLoaded(path) || registry.isPending(path)) {
      return
    }

    registry.markPending(path)

    return scheduler.enqueue(
      `prefetch:${path}`,
      async () => {
        const start = performance.now()
        try {
          await preloadRouteComponents(path)
          const duration = Math.round(performance.now() - start)
          registry.markLoaded(path, duration)
        }
        catch (err) {
          registry.markFailed(path, err instanceof Error ? err.message : String(err))
        }
      },
      priority,
      5000,
    )
  }

  /**
   * Preloads multiple routes in batch during idle time.
   */
  async function prefetchRoutes(paths: string[], priority: TaskPriority = 'idle'): Promise<void> {
    for (const path of paths) {
      await prefetchRoute(path, priority)
    }
  }

  /**
   * Preloads an async component or module loader during CPU idle time.
   */
  async function prefetchComponent(
    nameOrLoader: string | (() => Promise<any>),
    priority: TaskPriority = 'idle',
  ): Promise<void> {
    if (!bootContext) return
    const { registry, scheduler } = bootContext

    const isFunction = typeof nameOrLoader === 'function'
    const name = isFunction ? 'custom' : nameOrLoader
    const cacheKey = `component:${name}`

    if (registry.isLoaded(cacheKey) || registry.isPending(cacheKey)) {
      return
    }

    registry.markPending(cacheKey)

    return scheduler.enqueue(
      `prefetch:component:${name}`,
      async () => {
        const start = performance.now()
        try {
          if (isFunction) {
            await (nameOrLoader as () => Promise<any>)()
          }
          const duration = Math.round(performance.now() - start)
          registry.markLoaded(cacheKey, duration)
        }
        catch (err) {
          registry.markFailed(cacheKey, err instanceof Error ? err.message : String(err))
        }
      },
      priority,
      5000,
    )
  }

  /**
   * Manually dismisses the native splash screen if not already dismissed.
   */
  async function dismissSplash(): Promise<void> {
    if (bootContext?.dismissSplash) {
      await bootContext.dismissSplash()
    }
  }

  return {
    scheduleTask,
    prefetchRoute,
    prefetchRoutes,
    prefetchComponent,
    dismissSplash,
    isSplashDismissed: bootContext?.isDismissed ? readonly(bootContext.isDismissed) : true,
    scheduler: bootContext?.scheduler,
    registry: bootContext?.registry,
    getStatus: (): { pendingTasks: number, cachedChunks: ChunkCacheEntry[] } => ({
      pendingTasks: bootContext?.scheduler.pendingCount ?? 0,
      cachedChunks: bootContext?.registry.getAll() ?? [],
    }),
  }
}
