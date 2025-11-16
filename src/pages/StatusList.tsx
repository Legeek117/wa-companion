import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Heart, Search, RefreshCw, Lock, Crown, Smile } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useQuota } from "@/hooks/useQuota";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AvailableStatus {
  contactId: string;
  contactName: string;
  lastStatusTime: number;
  statusCount: number;
  hasUnviewed: boolean;
  latestStatusId?: string;
}

const StatusList = () => {
  const { isPremium, user } = useAuth();
  const { isConnected } = useWhatsApp();
  const { quota } = useQuota();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<{ [key: string]: string }>({});

  // Get available statuses
  const { data: availableStatuses = [], isLoading, refetch } = useQuery({
    queryKey: ['status', 'available', user?.id],
    queryFn: async () => {
      const response = await api.status.getAvailable();
      if (response.success && response.data) {
        return response.data as AvailableStatus[];
      }
      return [];
    },
    enabled: !!user && isConnected,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds (reduced from 30s to avoid rate limiting)
    refetchOnWindowFocus: false, // Disabled to avoid too many requests
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Get status likes to know which statuses have been reacted to
  const { data: likes = [] } = useQuery({
    queryKey: ['status', 'likes', user?.id],
    queryFn: async () => {
      const response = await api.status.list();
      if (response.success && response.data) {
        return response.data as any[];
      }
      return [];
    },
    enabled: !!user,
  });

  // Create a map of status IDs that have been liked
  const likedStatusIds = useMemo(() => {
    const liked = new Set<string>();
    likes.forEach((like: any) => {
      if (like.status_id) {
        liked.add(like.status_id);
      }
    });
    return liked;
  }, [likes]);

  // Like status mutation
  const likeMutation = useMutation({
    mutationFn: async ({ contactId, statusId, emoji }: { contactId: string; statusId: string; emoji: string }) => {
      return await api.status.like(contactId, statusId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status', 'available', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['status', 'likes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['quota', user?.id] });
    },
  });

  // Filter statuses by search query
  const filteredStatuses = useMemo(() => {
    if (!searchQuery.trim()) return availableStatuses;
    const query = searchQuery.toLowerCase();
    return availableStatuses.filter(status =>
      status.contactName.toLowerCase().includes(query) ||
      status.contactId.toLowerCase().includes(query)
    );
  }, [availableStatuses, searchQuery]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const statusDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (statusDate.getTime() === today.getTime()) {
        // Today - show time
        return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (statusDate.getTime() === today.getTime() - 86400000) {
        // Yesterday
        return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        // Older - show date and time
        return date.toLocaleString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    } catch {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    }
  };

  // Emojis for reactions
  const emojis = [
    "❤️", "😊", "😍", "🥰", "😘", "😗", "😙", "😚", "☺️", "🙂", "🤗", "🤩", "😎", "🤓", "🧐", "😇", "🥳", "😋", "😛", "🤪", "😜", "😝", "🤑", "🤣", "😂",
    "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏",
    "🔥", "💯", "✨", "🌟", "⭐", "💫", "⚡", "💥", "💢", "💦", "💨", "💣", "💬", "💭", "🗯️", "💤",
  ];

  const handleReaction = (contactId: string, contactName: string, emoji: string = "❤️") => {
    if (!isConnected) {
      toast.error("WhatsApp n'est pas connecté. Veuillez connecter votre compte WhatsApp d'abord.", {
        action: {
          label: "Se connecter",
          onClick: () => navigate('/dashboard/connect'),
        },
        duration: 5000,
      });
      return;
    }
    
    // Check quota for free users
    if (!isPremium && quota.statusReactions) {
      const { used, limit } = quota.statusReactions;
      if (used >= limit) {
        toast.error(`Quota de réactions dépassé (${limit}/jour). Passez à Premium pour des réactions illimitées.`, {
          action: {
            label: "Upgrade",
            onClick: () => navigate('/dashboard/upgrade'),
          },
          duration: 5000,
        });
      return;
    }
    }

    // Get the latest statusId for this contact
    const contactStatus = availableStatuses.find(s => s.contactId === contactId);
    const statusId = contactStatus?.latestStatusId || `status_${contactId}_${Date.now()}`;

    likeMutation.mutate(
      { contactId, statusId, emoji },
      {
        onSuccess: () => {
          toast.success(`Réaction ${emoji} envoyée à ${contactName} !`);
        },
        onError: (error: any) => {
          const errorMessage = error?.error?.message || error?.message || "Impossible d'envoyer la réaction";
          
          if (error?.error?.isQuotaExceeded) {
            toast.error(errorMessage, {
              action: {
                label: "Upgrade",
                onClick: () => navigate('/dashboard/upgrade'),
              },
              duration: 5000,
            });
          } else if (errorMessage.includes('not connected') || errorMessage.includes('connection lost')) {
            toast.error("WhatsApp n'est pas connecté. Veuillez reconnecter votre compte.", {
              action: {
                label: "Reconnecter",
                onClick: () => navigate('/dashboard/connect'),
              },
              duration: 5000,
            });
          } else {
            toast.error(`Erreur: ${errorMessage}`);
          }
        },
      }
    );
  };

  const statusReactionsQuota = quota.statusReactions || { used: 0, limit: isPremium ? Infinity : 2, remaining: isPremium ? Infinity : 2 };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Tous les status disponibles</p>
        </div>
          <Loading text="Chargement des statuts..." showLogo={true} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Tous les status disponibles</p>
          </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">WhatsApp n'est pas connecté</p>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez votre compte WhatsApp pour voir les status disponibles
            </p>
            <Button onClick={() => navigate('/dashboard/connect')}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (filteredStatuses.length === 0) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Tous les status disponibles</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun status disponible</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les status de vos contacts apparaîtront ici
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredStatuses.length} contact{filteredStatuses.length > 1 ? 's' : ''} avec des status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              {statusReactionsQuota.used}/{statusReactionsQuota.limit} réactions/jour
            </Badge>
          )}
          {isPremium && (
            <Badge variant="default" className="bg-premium text-premium-foreground text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Illimité
            </Badge>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher un contact..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status list - WhatsApp style */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredStatuses.map((status) => {
              const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${status.contactName}`;
              const isLiked = likedStatusIds.has(status.contactId); // Simplified check
              const currentEmoji = selectedEmoji[status.contactId] || "❤️";
            
            return (
                <div
                  key={status.contactId}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/dashboard/status/${encodeURIComponent(status.contactId)}`)}
                >
                  {/* Avatar with status indicator (blue circle like WhatsApp) */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-primary">
                      <AvatarImage src={avatarUrl} alt={status.contactName} />
                    <AvatarFallback className="text-sm font-medium">
                        {status.contactName[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                    {/* Blue circle indicator (like WhatsApp) */}
                    {status.hasUnviewed && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {status.contactName}
                      </h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(status.lastStatusTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {status.statusCount} statut{status.statusCount > 1 ? 's' : ''}
                      </p>
                      {isLiked && (
                    <Badge variant="secondary" className="text-xs">
                          <Heart className="w-3 h-3 mr-1 fill-primary text-primary" />
                          Réagi
                    </Badge>
                      )}
                  </div>
                  </div>

                  {/* Reaction button */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isPremium ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={!isConnected || likeMutation.isPending}
                          >
                            <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-2">
                          <p className="text-xs font-medium mb-2">Choisir une réaction</p>
                          <div className="grid grid-cols-6 gap-1">
                            {emojis.map((emoji, index) => (
                  <Button
                                key={`emoji-${index}-${emoji}`}
                                variant={currentEmoji === emoji ? "default" : "ghost"}
                    size="sm"
                                className="h-8 w-8 p-0 text-lg"
                                onClick={() => {
                                    setSelectedEmoji(prev => ({ ...prev, [status.contactId]: emoji }));
                                    handleReaction(status.contactId, status.contactName, emoji);
                                  }}
                                  disabled={!isConnected || likeMutation.isPending}
                              >
                                {emoji}
                  </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            disabled={
                              !isConnected ||
                              likeMutation.isPending ||
                              statusReactionsQuota.used >= statusReactionsQuota.limit
                            }
                          >
                            <Smile className="w-5 h-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                          <div className="space-y-2">
                            {statusReactionsQuota.used >= statusReactionsQuota.limit ? (
                              <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                                Quota de réactions atteint ({statusReactionsQuota.limit}/jour). Passez à Premium pour des réactions illimitées.
                              </div>
                            ) : (
                              <>
                                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-400">
                                  {statusReactionsQuota.remaining} réaction{statusReactionsQuota.remaining > 1 ? 's' : ''} restante{statusReactionsQuota.remaining > 1 ? 's' : ''} aujourd'hui
                                </div>
                                <p className="text-xs font-medium mb-2">Choisir une réaction</p>
                                <div className="grid grid-cols-6 gap-1">
                                  {emojis.map((emoji, index) => (
                                    <Button
                                      key={`emoji-${index}-${emoji}`}
                                      variant={currentEmoji === emoji ? "default" : "ghost"}
                                      size="sm"
                                      className="h-8 w-8 p-0 text-lg"
                                      onClick={() => {
                                        setSelectedEmoji(prev => ({ ...prev, [status.contactId]: emoji }));
                                        handleReaction(status.contactId, status.contactName, emoji);
                                      }}
                                      disabled={
                                        !isConnected ||
                                        likeMutation.isPending ||
                                        statusReactionsQuota.used >= statusReactionsQuota.limit
                                      }
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </>
                            )}
                    </div>
                        </PopoverContent>
                      </Popover>
                )}
                </div>
              </div>
            );
            })}
      </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusList;
