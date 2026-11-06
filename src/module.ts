import { defineNuxtModule, addPlugin, addImportsDir, createResolver } from '@nuxt/kit'
import { defu } from 'defu'
import type { ModuleOptions } from './types'

export type * from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@laylalabs/nuxt-progressive-boot',
    configKey: 'progressiveBoot',
    compatibility: {
      nuxt: '>=3.0.0 || >=4.0.0',
    },
  },
  defaults: {
    splash: {
      autoDismiss: true,
      strategy: 'page:finish',
      minDisplayMs: 0,
    },
    prefetch: {
      routes: {},
      delayMs: 1000,
      idleTimeoutMs: 3000,
    },
    debug: false,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Expose module options to runtime
    nuxt.options.runtimeConfig.public.progressiveBoot = defu(
      nuxt.options.runtimeConfig.public.progressiveBoot,
      options,
    )

    // Register client-side lifecycle and prefetch plugin
    addPlugin({
      src: resolver.resolve('./runtime/plugins/progressive-boot.client'),
      mode: 'client',
    })

    // Register auto-imported composables (useProgressiveLoader)
    addImportsDir(resolver.resolve('./runtime/composables'))
  },
})

declare module '@nuxt/schema' {
  interface NuxtConfig {
    progressiveBoot?: Partial<ModuleOptions>
  }
  interface NuxtOptions {
    progressiveBoot?: ModuleOptions
  }
}
