import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> = { data: T | null; error: unknown; loading: boolean; reload: () => void; setData: (v: T | null) => void };

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((v) => {
        if (id === run.current) setData(v);
      })
      .catch((e) => {
        if (id === run.current) setError(e);
      })
      .finally(() => {
        if (id === run.current) setLoading(false);
      });
    return () => {
      run.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
