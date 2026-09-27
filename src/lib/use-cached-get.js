"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { cachedGet, peekGet, subscribeGet } from "@/lib/get-cache";

export function useCachedGet(url, { refreshMs = 0, maxAge = 20000 } = {}) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);

  const reload = useCallback(() => {
    if (!url) return Promise.resolve(undefined);
    return cachedGet(url, { force: true, maxAge: 0 }).then((next) => {
      setData(next);
      setError("");
      setStatus(200);
      return next;
    });
  }, [url]);

  useLayoutEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    const cached = peekGet(url);
    setData(cached);
    setError("");
    setStatus(cached === undefined ? 0 : 200);

    function apply(next) {
      if (cancelled) return;
      setData(next);
      setError("");
      setStatus(200);
    }

    const unsubscribe = subscribeGet(url, apply);
    cachedGet(url, { maxAge })
      .then(apply)
      .catch((err) => {
        if (cancelled) return;
        setStatus(err.status || 0);
        setError(err.message || "Failed to load");
      });

    if (!refreshMs) {
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    const timer = setInterval(() => {
      cachedGet(url, { force: true, maxAge: 0 }).then(apply).catch(() => {});
    }, refreshMs);
    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(timer);
    };
  }, [url, refreshMs, maxAge]);

  return { data, error, status, ready: data !== undefined, reload };
}
