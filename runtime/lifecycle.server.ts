type Cleanup = () => void | Promise<unknown>;
export function createLifecycle() {
  const cleanups = new Set<Cleanup>();
  let stopping: Promise<void> | undefined;
  return {
    registerCleanup(cleanup: Cleanup) {
      cleanups.add(cleanup);
    },
    shutdown(flush: Cleanup = () => undefined): Promise<void> {
      return (stopping ??= (async () => {
        try {
          await Promise.allSettled([...cleanups].map(async (close) => close()));
        } finally {
          await flush();
        }
      })());
    },
  };
}
const shared = globalThis as typeof globalThis & {
  __blueprintLifecycle?: ReturnType<typeof createLifecycle>;
};
export const lifecycle = (shared.__blueprintLifecycle ??= createLifecycle());
export const registerCleanup = lifecycle.registerCleanup;
