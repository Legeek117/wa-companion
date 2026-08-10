import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

/**
 * In-memory cache of admin settings (avoid hitting DB on every single message)
 */
const settingsCache = new Map<string, boolean>();
const CACHE_TTL_MS = 10_000; // refresh every 10 seconds max
let lastCacheRefresh = 0;

const DEFAULTS: Record<string, boolean> = {
  global_message_capture: true,
  global_contact_capture: true,
};

/**
 * Force a cache refresh from DB
 */
const refreshCacheFromDb = async (): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('setting_key, value');

    if (error) throw error;

    settingsCache.clear();
    for (const key of Object.keys(DEFAULTS)) {
      settingsCache.set(key, DEFAULTS[key]);
    }
    if (data) {
      for (const row of data as any[]) {
        if (typeof row.value === 'boolean') {
          settingsCache.set(row.setting_key, row.value);
        }
      }
    }
    lastCacheRefresh = Date.now();
    logger.debug(`[AdminSettings] Cache refreshed: ${JSON.stringify(Object.fromEntries(settingsCache))}`);
  } catch (err) {
    logger.warn('[AdminSettings] Could not refresh from DB, using defaults:', (err as Error).message);
    for (const [k, v] of Object.entries(DEFAULTS)) {
      settingsCache.set(k, v);
    }
  }
};

/**
 * Get a boolean setting (uses cache, falls back to default)
 */
export const isSettingEnabled = async (key: string): Promise<boolean> => {
  const now = Date.now();
  if (!settingsCache.has(key) || now - lastCacheRefresh > CACHE_TTL_MS) {
    await refreshCacheFromDb();
  }
  const val = settingsCache.get(key);
  return typeof val === 'boolean' ? val : DEFAULTS[key] !== false;
};

/**
 * Shortcut functions
 */
export const isGlobalMessageCaptureEnabled = async (): Promise<boolean> =>
  isSettingEnabled('global_message_capture');

export const isGlobalContactCaptureEnabled = async (): Promise<boolean> =>
  isSettingEnabled('global_contact_capture');

/**
 * Get all settings (for API response)
 */
export const getAllSettings = async (): Promise<Record<string, boolean>> => {
  await refreshCacheFromDb();
  const out: Record<string, boolean> = {};
  for (const key of Object.keys(DEFAULTS)) {
    out[key] = await isSettingEnabled(key);
  }
  return out;
};

/**
 * Update a setting (DB + cache invalidate)
 */
export const updateSetting = async (
  key: string,
  value: boolean,
  updatedBy?: string
): Promise<boolean> => {
  if (!(key in DEFAULTS)) {
    throw new Error(`Unknown setting key: ${key}`);
  }

  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('admin_settings')
      .upsert(
        {
          setting_key: key,
          value,
          updated_at: now,
          updated_by: updatedBy || null,
        },
        { onConflict: 'setting_key' }
      );

    if (error) throw error;

    // Invalidate cache
    settingsCache.set(key, value);
    lastCacheRefresh = 0;
    logger.info(`[AdminSettings] ✅ Updated ${key} = ${value}`);
    return value;
  } catch (err) {
    logger.error(`[AdminSettings] Failed to update ${key}:`, err);
    throw err;
  }
};
