type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface FrontendLogPayload {
  level: LogLevel;
  message: string;
  source?: string;
  context?: Record<string, unknown>;
  path?: string;
  timestamp: string;
}

const LOG_ENDPOINT = '/api/logs/frontend';

const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('auth_token');
};

const sendLog = async (payload: FrontendLogPayload): Promise<void> => {
  const token = getToken();
  if (!token) {
    // Not authenticated; skip sending to avoid 401 spam
    return;
  }

  const body = JSON.stringify(payload);

  // Prefer sendBeacon to avoid blocking navigation
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(LOG_ENDPOINT, blob);
    return;
  }

  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      keepalive: true,
    });
  } catch {
    // Swallow errors - logging should never break UX
  }
};

const log =
  (level: LogLevel) =>
  (message: string, context?: Record<string, unknown>, source?: string): void => {
    if (import.meta.env.DEV) {
      console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}`, context || {});
    }

    sendLog({
      level,
      message,
      context: {
        ...context,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
      source,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      timestamp: new Date().toISOString(),
    });
  };

export const logger = {
  debug: log('debug'),
  info: log('info'),
  warn: log('warn'),
  error: log('error'),
};

export default logger;

