import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Download } from "lucide-react";
import { apiClient } from "@/lib/api";
import { APP_VERSION_CODE, APP_VERSION_NAME } from "@/config/appVersion";

interface LatestVersion {
  platform: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  notes?: string | null;
}

const CHECK_INTERVAL_MS = 45000;

export const UpdateGuard = () => {
  const [latest, setLatest] = useState<LatestVersion | null>(null);
  const [localCode, setLocalCode] = useState<number>(APP_VERSION_CODE);
  const [localName, setLocalName] = useState<string>(APP_VERSION_NAME);
  const [ready, setReady] = useState(false);
  const [dismissedCode, setDismissedCode] = useState<number | null>(null);

  const readInstalledVersion = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const info = await CapApp.getInfo();
      const buildCode = parseInt(info.build, 10);
      if (!Number.isNaN(buildCode)) setLocalCode(buildCode);
      if (info.version) setLocalName(info.version);
    } catch {
      // fallback to build-time env values
    }
  }, []);

  const refreshLatest = useCallback(async () => {
    try {
      const res = await apiClient.get<LatestVersion>('/api/version');
      if (res && res.success && res.data && typeof res.data.versionCode === 'number') {
        if (!latest || res.data.versionCode !== latest.versionCode) {
          setLatest(res.data);
        }
      }
    } catch {
      // No version published yet / offline -> never block the app
    }
  }, [latest]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await readInstalledVersion();
      await refreshLatest();
      if (mounted) setReady(true);
    })();

    const interval = setInterval(() => {
      void refreshLatest();
    }, CHECK_INTERVAL_MS);

    let resumeListener: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      // Re-check when the app comes back to the foreground
      CapApp.addListener('resume', () => {
        void readInstalledVersion();
        void refreshLatest();
      }).then((listener) => {
        resumeListener = listener;
      }).catch(() => {});
    }

    return () => {
      mounted = false;
      clearInterval(interval);
      resumeListener?.remove();
    };
  }, [readInstalledVersion, refreshLatest]);

  const openDownload = async () => {
    if (!latest) return;
    const versionCode = latest.versionCode;
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: latest.downloadUrl });
      } else {
        window.open(latest.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(latest.downloadUrl, '_blank', 'noopener,noreferrer');
    }
    setDismissedCode(versionCode);
  };

  if (!ready || !latest) return null;
  if (latest.versionCode <= localCode) return null;
  if (dismissedCode === latest.versionCode) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Download className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Nouvelle version disponible
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Version {latest.versionName} · Vous utilisez la {localName}
        </p>

        {latest.notes ? (
          <div className="mb-6 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line text-left max-h-40 overflow-y-auto">
            {latest.notes}
          </div>
        ) : (
          <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Une mise à jour de l'application est disponible. Mettez à jour pour profiter des dernières corrections.
          </div>
        )}

        <button
          onClick={openDownload}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.99] transition"
        >
          Mettre à jour
        </button>

        <button
          onClick={() => setDismissedCode(latest.versionCode)}
          className="mt-3 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};