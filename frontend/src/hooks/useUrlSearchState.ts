import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

type SetSearchParamsOptions = { replace?: boolean };

export function useUrlSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateParams = useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      options?: SetSearchParamsOptions,
    ) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value == null || value === '') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        { replace: options?.replace ?? true },
      );
    },
    [setSearchParams],
  );

  return { searchParams, updateParams, setSearchParams };
}

export function useUrlTab<T extends string>(
  paramName: string,
  validTabs: readonly T[],
  defaultTab: T,
): [T, (tab: T, extra?: Record<string, string | number | null | undefined>) => void] {
  const { searchParams, updateParams } = useUrlSearchParams();

  const activeTab = useMemo(() => {
    const raw = searchParams.get(paramName);
    if (raw && (validTabs as readonly string[]).includes(raw)) {
      return raw as T;
    }
    return defaultTab;
  }, [searchParams, paramName, validTabs, defaultTab]);

  const setActiveTab = useCallback(
    (tab: T, extra?: Record<string, string | number | null | undefined>) => {
      updateParams({
        [paramName]: tab === defaultTab ? null : tab,
        ...extra,
      });
    },
    [updateParams, paramName, defaultTab],
  );

  return [activeTab, setActiveTab];
}

export function useUrlOptionalTab<T extends string>(
  paramName: string,
  validTabs: readonly T[],
): [T | null, (tab: T | null, extra?: Record<string, string | number | null | undefined>) => void] {
  const { searchParams, updateParams } = useUrlSearchParams();

  const activeTab = useMemo(() => {
    const raw = searchParams.get(paramName);
    if (raw && (validTabs as readonly string[]).includes(raw)) {
      return raw as T;
    }
    return null;
  }, [searchParams, paramName, validTabs]);

  const setActiveTab = useCallback(
    (tab: T | null, extra?: Record<string, string | number | null | undefined>) => {
      updateParams({
        [paramName]: tab,
        ...extra,
      });
    },
    [updateParams, paramName],
  );

  return [activeTab, setActiveTab];
}

export function useUrlNumberParam(
  paramName: string,
): [number | null, (value: number | null, extra?: Record<string, string | number | null | undefined>) => void] {
  const { searchParams, updateParams } = useUrlSearchParams();

  const value = useMemo(() => {
    const raw = searchParams.get(paramName);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams, paramName]);

  const setValue = useCallback(
    (next: number | null, extra?: Record<string, string | number | null | undefined>) => {
      updateParams({
        [paramName]: next,
        ...extra,
      });
    },
    [updateParams, paramName],
  );

  return [value, setValue];
}
