import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const useAdmin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const adminToken = localStorage.getItem("admin_token");

  const login = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.admin.login(data);
      if (!response.success) throw new Error(response.error?.message);
      return response.data;
    },
    onSuccess: (data: any) => {
      localStorage.setItem("admin_token", data.token);
      toast.success("Connexion admin réussie");
      navigate("/admin");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur de connexion");
    },
  });

  const register = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.admin.register(data);
      if (!response.success) throw new Error(response.error?.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Compte admin créé avec succès. Vous pouvez vous connecter.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/auth");
  };

  const useUsers = () => {
    return useQuery({
      queryKey: ["admin", "users"],
      queryFn: async () => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.getUsers(adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      enabled: !!adminToken,
      refetchInterval: 15000,
    });
  };

  const useUserContacts = (userId: string) => {
    return useQuery({
      queryKey: ["admin", "contacts", userId],
      queryFn: async () => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.getUserContacts(userId, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      enabled: !!userId && !!adminToken,
      refetchInterval: 10000,
    });
  };

  const useSyncUserContacts = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.syncUserContacts(userId, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      onSuccess: (_, userId) => {
        toast.success("Contacts synchronisés avec succès");
        queryClient.invalidateQueries({ queryKey: ["admin", "contacts", userId] });
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de la synchronisation");
      },
    });
  };

  const useUserMessages = (userId: string, contactId: string) => {
    return useQuery({
      queryKey: ["admin", "messages", userId, contactId],
      queryFn: async () => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.getUserMessages(userId, contactId, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      enabled: !!userId && !!contactId && !!adminToken,
      refetchInterval: 2000,
    });
  };

  const useSendMessage = () => {
    return useMutation({
      mutationFn: async ({ userId, to, message }: { userId: string; to: string; message: string }) => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.sendMessageAsUser(userId, to, message, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      onSuccess: (_, variables) => {
        toast.success("Message envoyé avec succès");
        queryClient.invalidateQueries({ queryKey: ["admin", "messages", variables.userId, variables.to] });
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de l'envoi du message");
      },
    });
  };

  const useToggleLogging = () => {
    return useMutation({
      mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.toggleLogging(userId, enabled, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response;
      },
      onSuccess: (data: any) => {
        toast.success(data.data.enabled ? "Récupération activée" : "Récupération désactivée");
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de la modification");
      },
    });
  };

  const useSettings = () => {
    return useQuery({
      queryKey: ["admin", "settings"],
      queryFn: async () => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.getSettings(adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      enabled: !!adminToken,
    });
  };

  const useUpdateSetting = () => {
    return useMutation({
      mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.updateSetting(key, value, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      onSuccess: (_, variables) => {
        toast.success(`Paramètre ${variables.key} ${variables.value ? 'activé' : 'désactivé'}`);
        queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de la modification du paramètre");
      },
    });
  };

  return {
    login,
    register,
    logout,
    adminToken,
    useUsers,
    useUserContacts,
    useSyncUserContacts,
    useUserMessages,
    useSendMessage,
    useToggleLogging,
    useSettings,
    useUpdateSetting,
  };
};
