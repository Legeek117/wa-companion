// Current app build version. On native (Capacitor) these are usually read from the
// AndroidManifest/build.gradle via App.getInfo(), but we also expose build-time values
// so the web build / fallback can compare too.
export const APP_VERSION_NAME = (import.meta.env.VITE_APP_VERSION as string) || '1.0';

export const APP_VERSION_CODE = Number(import.meta.env.VITE_APP_VERSION_CODE || 1);

export const isUpdateAvailable = (serverVersionCode?: number): boolean => {
  if (typeof serverVersionCode !== 'number' || Number.isNaN(serverVersionCode)) return false;
  return serverVersionCode > APP_VERSION_CODE;
};