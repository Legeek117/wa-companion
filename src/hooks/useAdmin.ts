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
      navigate("/dashboard/admin");
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
      refetchInterval: 5000,
    });
  };

  const useSendMessage = (userId: string) => {
    return useMutation({
      mutationFn: async ({ to, message }: { to: string; message: string }) => {
        if (!adminToken) throw new Error("Non authentifié");
        const response = await api.admin.sendMessageAsUser(userId, to, message, adminToken);
        if (!response.success) throw new Error(response.error?.message);
        return response.data;
      },
      onSuccess: () => {
        toast.success("Message envoyé avec succès");
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de l'envoi du message");
      },
    });
  };

  const useToggleLogging = (userId: string) => {
    return useMutation({
      mutationFn: async (enabled: boolean) => {
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

  return {
    login,
    register,
    logout,
    adminToken,
    useUsers,
    useUserContacts,
    useUserMessages,
    useSendMessage,
    useToggleLogging,
  };
};
