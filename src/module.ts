import { defineNuxtModule, addPlugin, addImportsDir, addTemplate, createResolver } from '@nuxt/kit'
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
      components: [],
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

    // Track components discovered by Nuxt matching configured prefetch list
    let matchedComponents: { name: string, path: string }[] = []

    nuxt.hook('components:extend', (components) => {
      const configuredNames = new Set((options.prefetch?.components || []) as string[])
      if (configuredNames.size === 0) return

      const componentMap = new Map<string, string>()
      for (const c of components) {
        if ((configuredNames.has(c.pascalName) || configuredNames.has(c.kebabName)) && !componentMap.has(c.pascalName)) {
          componentMap.set(c.pascalName, c.filePath)
        }
      }

      matchedComponents = Array.from(componentMap.entries()).map(([name, path]) => ({
        name,
        path,
      }))
    })

    // Virtual file exporting dynamic component loaders
    addTemplate({
      filename: 'progressive-boot-components.mjs',
      getContents: () => {
        const lines = matchedComponents.map(
          c => `  ${JSON.stringify(c.name)}: () => import(${JSON.stringify(c.path)}),`,
        )
        return `export const componentLoaders = {\n${lines.join('\n')}\n};\n`
      },
    })

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
