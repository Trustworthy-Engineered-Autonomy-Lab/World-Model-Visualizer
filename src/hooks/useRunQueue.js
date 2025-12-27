
// src/visualizers/piwm/hooks/useRunQueue.js
import { useRef } from "react";

function makeRunQueue() {
  let chain = Promise.resolve();
  return async (fn) => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => { });
    return next;
  };
}

export function useRunQueue() {
  const queueRef = useRef(null);
  if (!queueRef.current) queueRef.current = makeRunQueue();
  return queueRef;
}
