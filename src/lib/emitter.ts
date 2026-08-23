// src/lib/emitter.ts
// A small typed event emitter.
//
// Replaces node's `events` module, which was being imported into a browser
// bundle. Webpack 5 ships no node polyfills, and `events` was not in the
// config's fallback map, so the build only resolved by accident through a
// transitive dependency. This has no dependencies and is typed per event.

export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>,
  ): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      bucket.delete(listener as Listener<never>);
      if (bucket.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Iterates a copy so a listener that unsubscribes during dispatch cannot
   * disturb the set being walked. A throwing listener is contained so it
   * cannot stop the others from running.
   */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of Array.from(bucket)) {
      try {
        (listener as Listener<Events[K]>)(payload);
      } catch (error) {
        console.error(
          '[emitter] listener for "' + String(event) + '" threw:',
          error,
        );
      }
    }
  }

  listenerCount<K extends keyof Events>(event: K): number {
    const bucket = this.listeners.get(event);
    return bucket ? bucket.size : 0;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
