import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface AutoresponderConfig {
  configs: Array<{
    id: string;
    user_id: string;
    mode: string;
    message: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
  }>;
  contacts: Array<{
    id: string;
    user_id: string;
    contact_id: string;
    contact_name: string;
    enabled: boolean;
    custom_message: string | null;
    created_at: string;
    updated_at: string;
  }>;
  isPremium: boolean;
}

/**
 * Hook for Autoresponder
 */
export function useAutoresponder() {
  const { user, isPremium: userIsPremium } = useAuth();
  const queryClient = useQueryClient();

  // Get autoresponder config
  const { data: config, isLoading } = useQuery({
    queryKey: ['autoresponder', 'config', user?.id],
    queryFn: async () => {
      const response = await api.autoresponder.getConfig();
      if (response.success && response.data) {
        return response.data as AutoresponderConfig;
      }
      return {
        configs: [],
        contacts: [],
        isPremium: userIsPremium, // Use premium status from useAuth
      };
    },
    enabled: !!user,
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds to keep premium status updated
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  // Get contacts separately (for premium users) - same method as status contacts
  // Use userIsPremium directly from useAuth for immediate detection
  const { data: fetchedContacts, isLoading: isLoadingContacts, error: contactsError } = useQuery({
    queryKey: ['autoresponder', 'contacts', user?.id],
    queryFn: async () => {
      console.log('[useAutoresponder] Fetching contacts...');
      const response = await api.autoresponder.getContacts();
      console.log('[useAutoresponder] Contacts response:', response);
      if (response.success && response.data) {
        console.log('[useAutoresponder] Fetched contacts:', response.data.length);
        return response.data as Array<{
          contact_id: string;
          contact_name: string;
          enabled: boolean;
          custom_message: string | null;
        }>;
      }
      console.log('[useAutoresponder] No contacts in response');
      return [];
    },
    enabled: !!user && userIsPremium, // Use userIsPremium directly from useAuth
    retry: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  // Debug logs
  console.log('[useAutoresponder] Debug:', {
    user: user?.id,
    isPremium: userIsPremium, // Use userIsPremium from useAuth
    configLoaded: config !== undefined,
    isLoadingConfig: isLoading,
    fetchedContactsCount: fetchedContacts?.length || 0,
    configContactsCount: config?.contacts?.length || 0,
    isLoadingContacts,
    contactsError,
    contactsQueryEnabled: !!user && userIsPremium, // Use userIsPremium directly
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ mode, enabled, message }: { mode: string; enabled: boolean; message?: string }) => {
      const response = await api.autoresponder.updateConfig({ mode, enabled, message });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update config');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoresponder', 'config', user?.id] });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, contactName, enabled, customMessage }: { contactId: string; contactName?: string; enabled: boolean; customMessage?: string }) => {
      const response = await api.autoresponder.updateContact(contactId, { enabled, customMessage, contactName });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update contact');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoresponder', 'config', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['autoresponder', 'contacts', user?.id] });
    },
  });

  // Get active mode
  const activeMode = config?.configs.find((c) => c.enabled);

  // Merge fetched contacts with config contacts (same method as status config)
  const mergedContacts = useMemo(() => {
    console.log('[useAutoresponder] Merging contacts...', {
      isPremium: config?.isPremium,
      fetchedContactsCount: fetchedContacts?.length || 0,
      configContactsCount: config?.contacts?.length || 0,
    });

    // Use userIsPremium from useAuth as the source of truth
    if (!userIsPremium) {
      console.log('[useAutoresponder] Not premium, using config contacts only');
      return config?.contacts || [];
    }

    // For premium users, use fetched contacts (from getAllContactsFromSocket)
    const fetched = fetchedContacts || [];
    const configContacts = config?.contacts || [];
    
    console.log('[useAutoresponder] Premium user, merging contacts', {
      fetchedCount: fetched.length,
      configCount: configContacts.length,
    });
    
    // Create a map of config contacts by contact_id
    const configContactsMap = new Map(
      configContacts.map((c) => [c.contact_id, c])
    );
    
    // Merge fetched contacts with config contacts
    const merged = fetched.map((contact) => {
      const configContact = configContactsMap.get(contact.contact_id);
      if (configContact) {
        // Use config values if they exist
        return {
          ...contact,
          id: configContact.id || contact.contact_id,
          user_id: configContact.user_id || user?.id || '',
          enabled: configContact.enabled ?? contact.enabled,
          custom_message: configContact.custom_message || contact.custom_message,
          created_at: configContact.created_at || new Date().toISOString(),
          updated_at: configContact.updated_at || new Date().toISOString(),
        };
      }
      return {
        ...contact,
        id: contact.contact_id,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    
    // Add any config contacts that aren't in fetched contacts
    configContacts.forEach((configContact) => {
      if (!fetched.find((c) => c.contact_id === configContact.contact_id)) {
        merged.push(configContact);
      }
    });
    
    console.log('[useAutoresponder] Merged contacts result:', merged.length);
    return merged;
  }, [config?.contacts, fetchedContacts, userIsPremium, user?.id]);

  // Refetch contacts function
  const refetchContacts = () => {
    queryClient.invalidateQueries({ queryKey: ['autoresponder', 'contacts', user?.id] });
  };

  // Track previous premium status to detect changes
  const prevPremiumRef = useRef(userIsPremium);
  
  // Invalidate queries when premium status changes
  useEffect(() => {
    // Only invalidate if premium status actually changed
    if (prevPremiumRef.current !== userIsPremium) {
      console.log('[useAutoresponder] Premium status changed:', {
        from: prevPremiumRef.current,
        to: userIsPremium,
      });
      
      // Update ref
      prevPremiumRef.current = userIsPremium;
      
      // Invalidate queries to refetch with new premium status
      queryClient.invalidateQueries({ queryKey: ['autoresponder', 'config', user?.id] });
      if (userIsPremium) {
        // Only fetch contacts if user is premium
        queryClient.invalidateQueries({ queryKey: ['autoresponder', 'contacts', user?.id] });
      }
    }
  }, [userIsPremium, user?.id, queryClient]);

  // Always use userIsPremium from useAuth as the source of truth
  const finalIsPremium = userIsPremium;

  return {
    config: config ? {
      ...config,
      contacts: mergedContacts,
    } : {
      configs: [],
      contacts: [],
      isPremium: finalIsPremium,
    },
    activeMode,
    isLoading: isLoading || isLoadingContacts,
    updateConfig: updateConfigMutation.mutate,
    updateContact: updateContactMutation.mutate,
    isUpdating: updateConfigMutation.isPending || updateContactMutation.isPending,
    isPremium: finalIsPremium,
    refetchContacts,
  };
}

