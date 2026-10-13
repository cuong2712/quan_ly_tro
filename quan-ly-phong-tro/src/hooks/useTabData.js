/**
 * useTabData - Lazy loading + caching per tab
 * Chỉ fetch dữ liệu khi tab được active, cache để không refetch khi quay lại
 */
import { useState, useCallback, useRef } from 'react';

const CACHE_TTL = 60 * 1000; // 1 phút

export function useTabData() {
  const cache = useRef({}); // { tabKey: { data, timestamp } }
  const inFlight = useRef({}); // { tabKey: Promise }
  const [loadingTabs, setLoadingTabs] = useState({});
  const [errorTabs, setErrorTabs] = useState({});

  const isCacheValid = useCallback((key) => {
    const entry = cache.current[key];
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  }, []);

  const getTabData = useCallback(async (tabKey, fetchFns) => {
    // Nếu cache còn hợp lệ, trả về ngay
    if (isCacheValid(tabKey)) {
      return cache.current[tabKey].data;
    }

    // Tránh gọi API song song trùng lặp nếu đang có request in-flight
    if (inFlight.current[tabKey]) {
      return inFlight.current[tabKey];
    }

    setLoadingTabs(prev => ({ ...prev, [tabKey]: true }));
    setErrorTabs(prev => ({ ...prev, [tabKey]: null }));

    const fetchPromise = (async () => {
      try {
        // Chạy song song tất cả fetch functions
        const keys = Object.keys(fetchFns);
        const results = await Promise.all(keys.map(k => fetchFns[k]()));
        const data = {};
        keys.forEach((k, i) => { data[k] = results[i]; });

        // Lưu vào cache
        cache.current[tabKey] = { data, timestamp: Date.now() };
        return data;
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Lỗi tải dữ liệu';
        setErrorTabs(prev => ({ ...prev, [tabKey]: msg }));
        return null;
      } finally {
        delete inFlight.current[tabKey];
        setLoadingTabs(prev => ({ ...prev, [tabKey]: false }));
      }
    })();

    inFlight.current[tabKey] = fetchPromise;
    return fetchPromise;
  }, [isCacheValid]);

  const invalidate = useCallback((tabKey) => {
    if (tabKey) {
      delete cache.current[tabKey];
      delete inFlight.current[tabKey];
    } else {
      cache.current = {}; // Xóa tất cả cache
      inFlight.current = {};
    }
  }, []);

  const invalidateMultiple = useCallback((...keys) => {
    keys.forEach(k => {
      delete cache.current[k];
      delete inFlight.current[k];
    });
  }, []);

  return { getTabData, loadingTabs, errorTabs, invalidate, invalidateMultiple };
}
