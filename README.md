# @laylalabs/nuxt-progressive-boot

> Progressive boot orchestrator for Nuxt: zero-flash splash screen synchronization, idle task prioritization, and predictive chunk prefetching.

[![Publish to GitHub Packages](https://github.com/LaylaLabs/nuxt-progressive-boot/actions/workflows/publish.yml/badge.svg)](https://github.com/LaylaLabs/nuxt-progressive-boot/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

- 🚀 **Zero-Flash Splash Screen Synchronization**: Coordinates native Capacitor (`@laylalabs/capacitor-splash-screen` or `@capacitor/splash-screen`) and Web splash screens with double `requestAnimationFrame` to ensure the first frame is painted on the GPU before dismissing.
- ⚡ **Idle Task Prioritization**: Framework-agnostic `IdleTaskScheduler` with priority queues (`critical`, `high`, `normal`, `idle`) utilizing `requestIdleCallback` with automatic timer fallbacks.
- 📦 **Predictive Route Prefetching**: Automatically downloads upcoming route chunks during CPU idle time based on declarative route maps.
- 🛡️ **Deduplicated Chunk Cache Registry**: In-memory registry preventing duplicate network transfers for components already requested or in flight.
- 🧩 **Zero Boilerplate**: Injects client plugins, auto-imports `useProgressiveLoader()`, and provides full TypeScript autocompletion in `nuxt.config.ts`.

---

## Installation

### GitHub Packages

1. Ensure your `.npmrc` has the `@laylalabs` scope configured:

```ini
@laylalabs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

2. Install the package via `pnpm`:

```bash
pnpm add @laylalabs/nuxt-progressive-boot
```

---

## Quick Start

Add `@laylalabs/nuxt-progressive-boot` to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [
    '@laylalabs/nuxt-progressive-boot',
  ],

  progressiveBoot: {
    // Splash screen lifecycle management
    splash: {
      autoDismiss: true,
      strategy: 'page:finish', // 'page:finish' | 'double-raf' | 'app:mounted' | 'manual'
      minDisplayMs: 0,
    },

    // Predictive route prefetching during CPU idle time
    prefetch: {
      routes: {
        '/onboarding': ['/'],
        '/': ['/radar', '/categorias', '/favoritos', '/perfil'],
      },
      delayMs: 1000,
      idleTimeoutMs: 3000,
    },

    debug: false,
  },
})
```

---

## Composable: `useProgressiveLoader`

The module provides an auto-imported composable for fine-grained control:

```vue
<script setup lang="ts">
const { scheduleTask, prefetchRoute, dismissSplash, getStatus } = useProgressiveLoader()

// Enqueue a non-critical background task
onMounted(() => {
  scheduleTask('sync-analytics', async () => {
    await sendTelemetry()
  }, 'idle')
})

// Dynamically prefetch a specific route on hover or interaction
function onHoverCategory() {
  prefetchRoute('/categorias')
}
</script>
```

### API Reference

| Method / Property | Type | Description |
| :--- | :--- | :--- |
| `scheduleTask(name, fn, priority, timeout)` | `Promise<T>` | Enqueues a task on the idle scheduler with a given priority (`critical`, `high`, `normal`, `idle`). |
| `prefetchRoute(path, priority?)` | `Promise<void>` | Preloads route components during idle time with deduplication. |
| `prefetchRoutes(paths, priority?)` | `Promise<void>` | Preloads a batch of route components sequentially during idle time. |
| `dismissSplash()` | `Promise<void>` | Manually triggers the native splash screen dismissal with double RAF. |
| `isSplashDismissed` | `Readonly<Ref<boolean>>` | Reactive boolean indicating if the splash screen has dismissed. |
| `getStatus()` | `Object` | Returns pending task count and currently cached chunks. |

---

## License

[MIT](./LICENSE)
