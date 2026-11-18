import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api.js';
import { formatErrorMessage } from '../lib/error.js';
import type { RecordItem } from '../types/index.js';

export function useList<T = RecordItem>(path: string | null) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState('');
  const generation = useRef(0);

  const reload = useCallback(async () => {
    if (!path) {
      setItems([]);
      setLoading(false);
      return;
    }
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await request<T[]>(path);
      if (current === generation.current) {
        setItems(result);
      }
    } catch (reason) {
      if (current === generation.current) {
        setError(formatErrorMessage(reason));
      }
    } finally {
      if (current === generation.current) {
        setLoading(false);
      }
    }
  }, [path]);

  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);

  return { items, loading, error, reload, setItems };
}
