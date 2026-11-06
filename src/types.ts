import type { GlobalComponents } from 'vue'

export type TaskPriority = 'critical' | 'high' | 'normal' | 'idle'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface TaskDefinition<T = any> {
  id: string
  name: string
  priority: TaskPriority
  timeoutMs?: number
  execute: () => Promise<T> | T
}

export interface ChunkCacheEntry {
  path: string
  status: 'pending' | 'loaded' | 'failed'
  loadedAt?: number
  durationMs?: number
  error?: string
}

export type SplashDismissStrategy = 'page:finish' | 'double-raf' | 'app:mounted' | 'manual'

export interface SplashOptions {
  /**
   * Whether to automatically dismiss the splash screen
   * @default true
   */
  autoDismiss?: boolean

  /**
   * Strategy for timing the splash screen dismissal:
   * - 'page:finish': Waits for Nuxt's page:finish hook + double requestAnimationFrame (Recommended)
   * - 'double-raf': Dismisses immediately after Nuxt app:mounted + double requestAnimationFrame
   * - 'app:mounted': Dismisses as soon as Vue mounts
   * - 'manual': Does not auto-dismiss; call useProgressiveLoader().dismissSplash() manually
   * @default 'page:finish'
   */
  strategy?: SplashDismissStrategy

  /**
   * Minimum duration in milliseconds the splash should remain visible
   * @default 0
   */
  minDisplayMs?: number

  /**
   * Custom dismiss callback if not using standard Capacitor Splash Screen
   */
  onDismiss?: () => Promise<void> | void
}

/**
 * Strongly-typed component name resolved from Nuxt's GlobalComponents registry.
 * Provides autocomplete for all auto-imported components in the project.
 */
export type ComponentName = keyof GlobalComponents extends never ? string : keyof GlobalComponents

export interface PrefetchOptions {
  /**
   * Route mapping for predictive prefetching.
   * Maps current route path to an array of target routes to prefetch during CPU idle time.
   * Example:
   * ```ts
   * routes: {
   *   '/onboarding': ['/'],
   *   '/': ['/radar', '/categorias', '/favoritos', '/perfil']
   * }
   * ```
   */
  routes?: Record<string, string[]>

  /**
   * Strongly-typed list of components to prefetch during CPU idle time after boot.
   * Autocompletes all components discovered by Nuxt in the consuming application.
   * Example:
   * ```ts
   * components: ['UIDrawer', 'OnboardingFlow']
   * ```
   */
  components?: ComponentName[]

  /**
   * Delay in milliseconds after navigation before scheduling idle prefetch tasks
   * @default 1000
   */
  delayMs?: number

  /**
   * Idle timeout in milliseconds for the prefetch task
   * @default 3000
   */
  idleTimeoutMs?: number
}

export interface ModuleOptions {
  /**
   * Splash screen orchestration options
   */
  splash?: SplashOptions

  /**
   * Predictive route and component prefetching options
   */
  prefetch?: PrefetchOptions

  /**
   * Whether to log progressive boot operations to console
   * @default false
   */
  debug?: boolean
}
