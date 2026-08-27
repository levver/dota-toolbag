export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
}

export const cookies = {
  get<T>(name: string, defaultValue: T): T {
    try {
      if (typeof document === 'undefined') return defaultValue;
      const nameEQ = `${encodeURIComponent(name)}=`;
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          const raw = decodeURIComponent(c.substring(nameEQ.length, c.length));
          try {
            return JSON.parse(raw) as T;
          } catch {
            return raw as unknown as T;
          }
        }
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(name: string, value: T, options: CookieOptions = {}): boolean {
    try {
      if (typeof document === 'undefined') return false;
      const { days = 365, path = '/', sameSite = 'Lax', secure = false } = options;
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(serialized)}; expires=${expires.toUTCString()}; path=${path}; SameSite=${sameSite}`;
      if (secure) cookieStr += '; Secure';
      
      document.cookie = cookieStr;
      return true;
    } catch {
      return false;
    }
  },

  remove(name: string, path = '/'): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
  }
};
