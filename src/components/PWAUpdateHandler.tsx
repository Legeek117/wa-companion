import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function PWAUpdateHandler() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needUpdate: [needUpdate, setNeedUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('L\'application est prête pour un usage hors-ligne !', {
        id: 'pwa-offline',
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needUpdate) {
      toast('Une nouvelle version est disponible !', {
        id: 'pwa-update',
        duration: Infinity,
        action: (
          <Button 
            size="sm" 
            onClick={() => updateServiceWorker(true)}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Mettre à jour
          </Button>
        ),
      });
    }
  }, [needUpdate, updateServiceWorker]);

  return null;
}
