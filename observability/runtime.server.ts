type Cleanup = () => void | Promise<unknown>;
type Runtime = { cleanups: Set<Cleanup>; shutdownSdk?: Cleanup; stopping?: Promise<void> };
const shared = globalThis as typeof globalThis & { __blueprintObservability?: Runtime };
export const runtime = (shared.__blueprintObservability ??= { cleanups: new Set() });

export function registerCleanup(cleanup: Cleanup) {
  runtime.cleanups.add(cleanup);
}

export function shutdownObservability(): Promise<void> {
  return (runtime.stopping ??= (async () => {
    try {
      await Promise.allSettled([...runtime.cleanups.values()].map(async (close) => close()));
    } finally {
      await runtime.shutdownSdk?.();
    }
  })());
}
