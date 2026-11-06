import type { ChunkCacheEntry } from '../../types'

export class ChunkCacheRegistry {
  private cache = new Map<string, ChunkCacheEntry>()

  public isLoaded(path: string): boolean {
    return this.cache.get(path)?.status === 'loaded'
  }

  public isPending(path: string): boolean {
    return this.cache.get(path)?.status === 'pending'
  }

  public markPending(path: string): void {
    this.cache.set(path, {
      path,
      status: 'pending',
    })
  }

  public markLoaded(path: string, durationMs?: number): void {
    this.cache.set(path, {
      path,
      status: 'loaded',
      loadedAt: Date.now(),
      durationMs,
    })
  }

  public markFailed(path: string, error?: string): void {
    this.cache.set(path, {
      path,
      status: 'failed',
      error,
    })
  }

  public get(path: string): ChunkCacheEntry | undefined {
    return this.cache.get(path)
  }

  public getAll(): ChunkCacheEntry[] {
    return Array.from(this.cache.values())
  }

  public clear(): void {
    this.cache.clear()
  }
}

