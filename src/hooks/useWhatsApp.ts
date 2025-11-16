import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import { toast } from 'sonner';

export interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
  pairingCode?: string;
  connectedAt?: string;
  lastSeen?: string;
}

export interface QRResponse {
  qrCode: string;
  sessionId: string;
}

export interface PairingCodeResponse {
  pairingCode: string;
  sessionId: string;
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
        throw error;
      }
    },
    enabled: !!apiClient.getToken(), // Only fetch if user is authenticated
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as WhatsAppStatus | undefined;
      // Poll every 2 seconds if connecting (to catch QR code updates)
      if (data?.status === 'connecting') return 2000;
      // Poll every 30 seconds if connected (to check if still connected)
      if (data?.status === 'connected') return 30000;
      // Poll every 10 seconds if disconnected and has QR code or pairing code (user might be connecting)
      if (data?.status === 'disconnected' && (data?.qrCode || data?.pairingCode)) return 10000;
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
      if (data.qrCode) {
        toast.success('QR code généré avec succès !');
        // Update query cache with QR code and set status to connecting
        queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
          ...(old || {}),
          qrCode: data.qrCode,
          status: 'connecting' as const,
        }));
        // Invalidate to trigger refetch and ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
      } else {
        toast.info('Génération du QR code en cours...');
        // Update status to connecting even if QR code is not yet available
        queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
          ...(old || {}),
          status: 'connecting' as const,
        }));
        // Poll for QR code status
        let attempts = 0;
        const maxAttempts = 30; // 30 * 2s = 60 seconds max
        const pollStatus = async () => {
          console.log(`[WhatsApp] Polling for QR code, attempt ${attempts + 1}/${maxAttempts}`);
          const result = await refetch();
          attempts++;
          const currentStatus = result.data as WhatsAppStatus | undefined;
          console.log('[WhatsApp] Poll result:', {
            hasQRCode: !!currentStatus?.qrCode,
            status: currentStatus?.status,
            qrCodeLength: currentStatus?.qrCode?.length || 0,
          });
          if (currentStatus?.qrCode) {
            toast.success('QR code généré avec succès !');
          } else if (attempts < maxAttempts) {
            setTimeout(pollStatus, 2000);
          } else {
            toast.error('Le QR code n\'a pas pu être généré. Essayez avec le code de couplage.');
            // Reset status if QR code generation failed
            queryClient.setQueryData(['whatsapp', 'status'], (old: WhatsAppStatus | undefined) => ({
              ...(old || {}),
              status: 'disconnected' as const,
            }));
          }
        };
        setTimeout(pollStatus, 2000);
      }
    },
    onError: (error: Error) => {
      console.error('[WhatsApp] Mutation error:', error);
      toast.error(error.message || 'Erreur lors de la génération');
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
        // Poll for pairing code status
        let attempts = 0;
        const maxAttempts = 20; // 20 * 2s = 40 seconds max
        const pollStatus = async () => {
          console.log(`[WhatsApp] Polling for pairing code, attempt ${attempts + 1}/${maxAttempts}`);
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
            setTimeout(pollStatus, 2000);
          } else {
            toast.error('Le code de couplage n\'a pas pu être généré. Veuillez réessayer.');
          }
        };
        setTimeout(pollStatus, 2000);
      }
    },
    onError: (error: Error) => {
      console.error('[WhatsApp] Pairing code mutation error:', error);
      
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
    refetch,
  };
}

