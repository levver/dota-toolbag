/**
 * Type-safe localStorage wrapper with schema fallback and error handling.
 */
export const storage = {
  get<T>(key: string, defaultValue: T, validator?: (data: unknown) => data is T): T {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return defaultValue;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[storage] Validation failed for key "${key}", using default.`, parsed);
        return defaultValue;
      }
      return parsed as T;
    } catch (e) {
      console.warn(`[storage] Error reading key "${key}":`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`[storage] Error writing key "${key}":`, e);
      return false;
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`[storage] Error removing key "${key}":`, e);
    }
  }
};
