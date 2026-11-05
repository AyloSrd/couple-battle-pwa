type TStores = Record<string, Record<string, unknown>>;
type TFakeOpts = { failOpen?: boolean; hang?: boolean; blockDelete?: boolean };

/** A hand-written IndexedDB double: just the calls the import makes, answered asynchronously. */
export function fakeIdb(databases: Record<string, TStores>, opts: TFakeOpts = {}) {
  const calls = { open: 0, deleted: [] as string[], closed: 0 };
  const later = (fn: () => void) => setTimeout(fn, 0);
  const request = <T,>(result: T) => {
    const req = { result, onsuccess: null as null | (() => void) };
    later(() => req.onsuccess?.());
    return req;
  };
  const factory = {
    open(name: string) {
      calls.open++;
      const req = {
        result: undefined as unknown,
        error: null as unknown,
        transaction: null as null | { abort(): void },
        onupgradeneeded: null as null | (() => void),
        onsuccess: null as null | (() => void),
        onerror: null as null | (() => void),
      };
      if (opts.hang) return req;
      later(() => {
        if (opts.failOpen) {
          req.error = new DOMException('broken', 'UnknownError');
          req.onerror?.();
          return;
        }
        const stores = databases[name];
        if (!stores) {
          let aborted = false;
          req.transaction = { abort: () => (aborted = true) };
          req.onupgradeneeded?.();
          if (aborted) {
            req.error = new DOMException('aborted', 'AbortError');
            req.onerror?.();
          } else databases[name] = {};
          return;
        }
        req.result = {
          objectStoreNames: { contains: (store: string) => store in stores },
          transaction: (store: string) => ({ objectStore: () => ({ get: (key: string) => request(stores[store]?.[key]) }) }),
          close: () => calls.closed++,
        };
        req.onsuccess?.();
      });
      return req;
    },
    deleteDatabase(name: string) {
      const req = { onsuccess: null as null | (() => void), onblocked: null as null | (() => void) };
      later(() => {
        if (opts.blockDelete) return req.onblocked?.();
        delete databases[name];
        calls.deleted.push(name);
        req.onsuccess?.();
      });
      return req;
    },
  };
  return { idb: factory as unknown as IDBFactory, calls, databases };
}
