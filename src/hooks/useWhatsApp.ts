import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import logger from '@/lib/logger';
import { toast } from 'sonner';

export interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
  pairingCode?: string;
  connectedAt?: string;
  lastSeen?: string;
  hasSavedSession?: boolean;
}

export interface QRResponse {
  qrCode: string;
  sessionId: string;
}

export interface PairingCodeResponse {
  pairingCode: string;
  sessionId: string;
}

export interface ManualReconnectResult {
  success: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'no-credentials' | 'error';
  message: string;
}

/**
 * Hook for WhatsApp operations
 */
export function useWhatsApp() {
  const queryClient = useQueryClient();

  // Get WhatsApp status
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => {
      try {
        const response = await api.whatsapp.getStatus();
        console.log('[WhatsApp] Status response:', {
          success: response.success,
          status: response.data?.status,
          hasQRCode: !!response.data?.qrCode,
          hasPairingCode: !!response.data?.pairingCode,
          error: response.error,
        });
        if (response.success && response.data) {
          return response.data as WhatsAppStatus;
        }
        throw new Error(response.error?.message || 'Failed to get WhatsApp status');
      } catch (error) {
        console.error('[WhatsApp] Error fetching status:', error);
        logger.error('WhatsApp status fetch failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    enabled: !!apiClient.getToken(), // Only fetch if user is authenticated
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as WhatsAppStatus | undefined;
      // Poll every 5 seconds if connecting (reduced from 2s to avoid rate limiting)
      if (data?.status === 'connecting') return 5000;
      // Poll every 30 seconds if connected (to check if still connected)
      if (data?.status === 'connected') return 30000;
      // Poll every 15 seconds if disconnected and has QR code or pairing code (reduced from 10s)
      if (data?.status === 'disconnected' && (data?.qrCode || data?.pairingCode)) return 15000;
      // Otherwise, don't poll (to avoid unnecessary requests)
      return false;
    },
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
    refetchOnMount: true, // Refetch when component mounts
  });

  // Get QR code mutation
  const getQRMutation = useMutation({
    mutationFn: async () => {
      console.log('[WhatsApp] Requesting QR code...');
      const response = await api.whatsapp.getQR();
      console.log('[WhatsApp] QR code response:', {
        success: response.success,
        hasQRCode: !!response.data?.qrCode,
        qrCodeLength: response.data?.qrCode?.length || 0,
        error: response.error,
      });
      if (response.success && response.data) {
        // If QR code is empty, treat it as an error
        if (!response.data.qrCode || response.data.qrCode.length === 0) {
          throw new Error('Le code QR n\'a pas pu être généré. Veuillez réessayer ou utiliser le code de couplage.');
        }
        return response.data as QRResponse;
      }
      throw new Error(response.error?.message || 'Failed to get QR code');
    },
    onSuccess: async (data) => {
      console.log('[WhatsApp] QR code mutation success:', {
        hasQRCode: !!data.qrCode,
        qrCodeLength: data.qrCode?.length || 0,
        sessionId: data.sessionId,
      });
      // QR code should always be present if we reach here (checked in mutationFn)
      toast.success('QR code généré avec succès !');
      // Update query cache with QR code and set status to connecting
      queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
        ...(old || {}),
        qrCode: data.qrCode,
        status: 'connecting' as const,
      }));
      // Invalidate to trigger refetch and ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
    },
    onError: (error: Error) => {
      console.error('[WhatsApp] QR code mutation error:', error);
      logger.error('QR code mutation error', {
        error: error.message,
      });
      
      // Extract error message from API response if available
      let errorMessage = error.message || 'Erreur lors de la génération du code QR';
      
      // Check if error message contains useful information
      if (errorMessage.includes('timeout') || errorMessage.includes('n\'a pas pu être généré')) {
        errorMessage = 'Le code QR n\'a pas pu être généré dans le délai imparti. Essayez avec le code de couplage.';
      } else if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        errorMessage = 'Erreur serveur lors de la génération du code QR. Veuillez réessayer dans quelques instants.';
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = 'Service non disponible. Veuillez réessayer plus tard.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
      
      // Reset status on error
      queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
        ...(old || {}),
        status: 'disconnected' as const,
        qrCode: undefined,
      }));
    },
  });

  // Get pairing code mutation
  const getPairingCodeMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      console.log('[WhatsApp] Requesting pairing code for phone number:', phoneNumber);
      const response = await api.whatsapp.getPairingCode(phoneNumber);
      console.log('[WhatsApp] Pairing code response:', {
        success: response.success,
        hasPairingCode: !!response.data?.pairingCode,
        pairingCode: response.data?.pairingCode || null,
        error: response.error,
      });
      if (response.success && response.data) {
        return response.data as PairingCodeResponse;
      }
      throw new Error(response.error?.message || 'Failed to get pairing code');
    },
    onSuccess: async (data) => {
      console.log('[WhatsApp] Pairing code mutation success:', {
        hasPairingCode: !!data.pairingCode,
        pairingCode: data.pairingCode || null,
      });
      if (data.pairingCode) {
        toast.success(`Code de couplage généré : ${data.pairingCode}`);
        // Update query cache with pairing code
        queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
          ...old,
          pairingCode: data.pairingCode,
          qrCode: undefined, // Clear QR code when using pairing code
          status: 'connecting' as const,
        }));
      } else {
        toast.info('Génération du code de couplage en cours...');
        // Poll for pairing code status (reduced frequency to avoid rate limiting)
        let attempts = 0;
        const maxAttempts = 12; // 12 * 5s = 60 seconds max
        let pollTimeout: NodeJS.Timeout | null = null;
        const pollStatus = async () => {
          // Check if user switched to QR code (stop polling if so)
          const currentData = queryClient.getQueryData(['whatsapp', 'status']) as WhatsAppStatus | undefined;
          if (currentData?.qrCode) {
            console.log('[WhatsApp] User switched to QR code, stopping pairing code polling');
            return;
          }
          
          console.log(`[WhatsApp] Polling for pairing code, attempt ${attempts + 1}/${maxAttempts}`);
          try {
            const result = await refetch();
            attempts++;
            const currentStatus = result.data as WhatsAppStatus | undefined;
            console.log('[WhatsApp] Poll result:', {
              hasPairingCode: !!currentStatus?.pairingCode,
              status: currentStatus?.status,
            });
            if (currentStatus?.pairingCode) {
              toast.success(`Code de couplage : ${currentStatus.pairingCode}`);
            } else if (attempts < maxAttempts) {
              pollTimeout = setTimeout(pollStatus, 5000); // Increased from 2s to 5s
            } else {
              toast.error('Le code de couplage n\'a pas pu être généré. Veuillez réessayer.');
              // Reset status on timeout
              queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
                ...(old || {}),
                status: 'disconnected' as const,
                pairingCode: undefined,
              }));
            }
          } catch (error) {
            console.error('[WhatsApp] Error polling for pairing code:', error);
            logger.warn('Pairing code polling error', {
              error: error instanceof Error ? error.message : String(error),
            });
            if (attempts < maxAttempts) {
              pollTimeout = setTimeout(pollStatus, 5000);
            } else {
              queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
                ...(old || {}),
                status: 'disconnected' as const,
                pairingCode: undefined,
              }));
            }
          }
        };
        pollTimeout = setTimeout(pollStatus, 5000); // Start after 5 seconds
      }
    },
    onError: (error: Error) => {
      console.error('[WhatsApp] Pairing code mutation error:', error);
      logger.error('Pairing code mutation error', { error: error.message });
      
      // Extract error message from API response if available
      let errorMessage = error.message || 'Erreur lors de la génération du code de couplage';
      
      // Check if error message contains useful information
      if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
        errorMessage = 'Erreur serveur lors de la génération du code de couplage. Veuillez réessayer dans quelques instants.';
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = 'Service non disponible. Veuillez réessayer plus tard.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
      
      // Reset status on error
      queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
        ...(old || {}),
        status: 'disconnected' as const,
        pairingCode: undefined,
      }));
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.whatsapp.disconnect();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to disconnect');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp'] });
      toast.success('WhatsApp déconnecté');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la déconnexion');
    },
  });

  // Manual reconnect mutation
  const reconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.whatsapp.reconnect();
      if (response.success && response.data) {
        return response.data as ManualReconnectResult;
      }
      throw new Error(response.error?.message || 'Impossible de relancer la connexion automatiquement');
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Reconnexion lancée');
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la reconnexion');
    },
  });

  return {
    status,
    isLoading,
    isConnected: status?.status === 'connected',
    isConnecting: status?.status === 'connecting' || status?.status === 'disconnected' && (status?.qrCode || status?.pairingCode),
    getQR: () => {
      console.log('[WhatsApp] getQR called');
      getQRMutation.mutate();
    },
    getPairingCode: (phoneNumber: string) => {
      console.log('[WhatsApp] getPairingCode called with phone number:', phoneNumber);
      getPairingCodeMutation.mutate(phoneNumber);
    },
    disconnect: disconnectMutation.mutate,
    isGettingQR: getQRMutation.isPending,
    isGettingPairingCode: getPairingCodeMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    reconnect: reconnectMutation.mutate,
    isReconnecting: reconnectMutation.isPending,
    refetch,
  };
}

