/**
 * useApi - Custom hook để fetch data từ backend API
 * Thay thế hoàn toàn initialMockData
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, _deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, setData };
}

export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (fn, onSuccess, onError) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
      setError(msg);
      onError?.(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
