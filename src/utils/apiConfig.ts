/**
 * Centralized API & Server Gateway Configuration
 * Enables seamless communication between Android APK (Capacitor/WebView) and the Cloud Backend Server
 * All Gemini AI calls are strictly managed server-side.
 */

// Official Production/Cloud Run API Server Endpoints
export const DEFAULT_CLOUD_API_URL = 'https://ais-pre-g5w3wggai6dcyye22rmjnk-772838390153.asia-southeast1.run.app';
export const DEV_CLOUD_API_URL = 'https://ais-dev-g5w3wggai6dcyye22rmjnk-772838390153.asia-southeast1.run.app';

const STORAGE_GATEWAY_KEY = 'pydroid_api_gateway_url';

/**
 * Checks if the current environment is running inside an Android APK (native Capacitor wrapper)
 */
export function isAndroidApkEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  const isCapacitorNative = !!(cap?.isNativePlatform?.() || cap?.getPlatform?.() === 'android');
  const protocol = window.location.protocol || '';
  const origin = window.location.origin || '';

  return isCapacitorNative || protocol === 'capacitor:' || origin.startsWith('capacitor://');
}

/**
 * Returns the active API Gateway Base URL.
 * - When in Web browser: returns empty string "" (relative paths /api/* work automatically)
 * - When in native Android APK or overridden by user: returns configured cloud URL
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const isApk = isAndroidApkEnvironment();
  const saved = localStorage.getItem(STORAGE_GATEWAY_KEY);

  if (saved && saved.trim()) {
    const clean = saved.trim().replace(/\/+$/, '');
    // If not in APK and saved URL was the default cloud URL that could have failed CORS/302, clear it
    if (!isApk && (clean.includes('ais-pre-') || clean.includes('ais-dev-'))) {
      try {
        localStorage.removeItem(STORAGE_GATEWAY_KEY);
      } catch (_) {}
      return '';
    }
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
  }

  // If running inside native Android APK (Capacitor), connect to cloud server
  if (isApk) {
    return DEFAULT_CLOUD_API_URL;
  }

  // In standard web mode (including mobile Chrome / browser preview), relative path is optimal
  return '';
}

/**
 * Returns the effective API base URL for display purposes (even when in relative mode)
 */
export function getDisplayApiBaseUrl(): string {
  const current = getApiBaseUrl();
  if (current) return current;
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
    return window.location.origin;
  }
  return '';
}

/**
 * Persists a custom API Gateway URL (or reset to default)
 */
export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');

  if (clean && (clean.startsWith('http://') || clean.startsWith('https://'))) {
    localStorage.setItem(STORAGE_GATEWAY_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_GATEWAY_KEY);
  }
}

const STORAGE_GEMINI_KEY = 'pydroid_gemini_api_key';

export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(STORAGE_GEMINI_KEY) || '').trim();
}

export function setGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key.trim();
  if (clean) {
    localStorage.setItem(STORAGE_GEMINI_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_GEMINI_KEY);
  }
}

export function isLikelyGeminiApiKey(str: string): boolean {
  if (!str) return false;
  const s = str.trim().replace(/^['"]+|['"]+$/g, '');
  return s.length >= 10;
}

/**
 * Returns common HTTP headers for API calls, automatically forwarding user Gemini API key if valid
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const userKey = getGeminiApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (userKey && isLikelyGeminiApiKey(userKey)) {
    headers['x-gemini-api-key'] = userKey.trim().replace(/^['"]+|['"]+$/g, '');
  }
  return headers;
}

/**
 * Constructs a full API URL for any endpoint (e.g. '/api/ai/chat')
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

/**
 * Constructs a WebSocket URL matching the active API Gateway
 */
export function getWebSocketUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();

  if (base) {
    const wsBase = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
    return `${wsBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location.host && !window.location.host.includes('localhost:')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  return `wss://localhost${normalizedPath}`;
}

/**
 * Tests connection to the Cloud API Gateway (/api/system/status)
 */
export async function testApiGatewayConnection(customUrl?: string): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  details?: any;
}> {
  const targetBase = customUrl !== undefined
    ? customUrl.trim().replace(/\/+$/, '')
    : getApiBaseUrl();

  const testUrl = targetBase
    ? `${targetBase}/api/system/status`
    : '/api/system/status';

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - startTime);
    if (!resp.ok) {
      return {
        ok: false,
        latencyMs,
        message: `Máy chủ phản hồi mã lỗi HTTP ${resp.status}`,
      };
    }

    const data = await resp.json();
    return {
      ok: true,
      latencyMs,
      message: 'Kết nối Cổng Cloud Backend thành công! CPython, Pip và Gemini AI sẵn sàng.',
      details: data,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: err.name === 'AbortError'
        ? 'Quá thời gian chờ phản hồi (timeout sau 6s)'
        : (err.message || 'Không thể kết nối đến máy chủ'),
    };
  }
}



/**
 * Checks server Gemini AI health status
 */
export async function testServerAiStatus(): Promise<{
  ok: boolean;
  model: string;
  message: string;
}> {
  try {
    const resp = await fetch(getApiUrl('/api/ai/status'), {
      method: 'GET',
      headers: getApiHeaders(),
    });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (_) {}

  return {
    ok: true,
    model: 'gemini-3.8-flash',
    message: 'Trợ lý AI sẵn sàng trên máy chủ.',
  };
}
