import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, Lock, Crown, Smile } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useNavigate, useParams } from "react-router-dom";
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

interface StatusItem {
  id: string;
  timestamp: number;
  caption?: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  hasReaction?: boolean;
  reactionEmoji?: string;
}

interface ContactStatus {
  contactId: string;
  contactName: string;
  statuses: StatusItem[];
}

const StatusDetail = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const { isPremium, user } = useAuth();
  const { isConnected } = useWhatsApp();
  const { quota } = useQuota();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEmoji, setSelectedEmoji] = useState<{ [key: string]: string }>({});

  // Get contact statuses
  const { data: contactStatus, isLoading } = useQuery({
    queryKey: ['status', 'contact', contactId, user?.id],
    queryFn: async () => {
      if (!contactId) return null;
      const response = await api.status.getContactStatuses(contactId);
      if (response.success && response.data) {
        return response.data as ContactStatus;
      }
      return null;
    },
    enabled: !!user && !!contactId && isConnected,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
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
    const liked = new Map<string, string>(); // statusId -> emoji
    likes.forEach((like: any) => {
      if (like.status_id && like.emoji) {
        liked.set(like.status_id, like.emoji);
      }
    });
    return liked;
  }, [likes]);

  // Like status mutation
  const likeMutation = useMutation({
    mutationFn: async ({ statusId, emoji }: { statusId: string; emoji: string }) => {
      if (!contactId) throw new Error('Contact ID is required');
      return await api.status.like(contactId, statusId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status', 'contact', contactId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['status', 'available', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['status', 'likes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['quota', user?.id] });
    },
  });

  // Format timestamp
  const formatTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const statusDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (statusDate.getTime() === today.getTime()) {
        return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      } else if (statusDate.getTime() === today.getTime() - 86400000) {
        return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
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

  const handleReaction = (statusId: string, emoji: string = "❤️") => {
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

    likeMutation.mutate(
      { statusId, emoji },
      {
        onSuccess: () => {
          toast.success(`Réaction ${emoji} envoyée !`);
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/status/list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Status</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <Loading text="Chargement des statuts..." showLogo={true} />
      </div>
    );
  }

  if (!contactStatus) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/status/list')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Status</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Aucun status trouvé pour ce contact</p>
            <Button onClick={() => navigate('/dashboard/status/list')} className="mt-4">
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${contactStatus.contactName}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/status')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary">
            <AvatarImage src={avatarUrl} alt={contactStatus.contactName} />
            <AvatarFallback className="text-sm font-medium">
              {contactStatus.contactName[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{contactStatus.contactName}</h1>
            <p className="text-sm text-muted-foreground">
              {contactStatus.statuses.length} statut{contactStatus.statuses.length > 1 ? 's' : ''}
            </p>
          </div>
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

      {/* Status list */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {contactStatus.statuses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Aucun status disponible</p>
              </div>
            ) : (
              contactStatus.statuses.map((status) => {
                const currentEmoji = selectedEmoji[status.id] || likedStatusIds.get(status.id) || "❤️";
                const hasReaction = likedStatusIds.has(status.id);

                return (
                  <div
                    key={status.id}
                    className="flex items-start gap-3 sm:gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    {/* Status content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {formatTime(status.timestamp)}
                        </span>
                        {hasReaction && (
                          <Badge variant="secondary" className="text-xs">
                            <Heart className="w-3 h-3 mr-1 fill-primary text-primary" />
                            Réagi {likedStatusIds.get(status.id)}
                          </Badge>
                        )}
                      </div>
                      
                      {status.type === 'image' && status.url && (
                        <div className="mb-2">
                          <img
                            src={status.url}
                            alt={status.caption || 'Status image'}
                            className="max-w-full h-auto rounded-lg border border-border"
                          />
                        </div>
                      )}
                      
                      {status.type === 'video' && status.url && (
                        <div className="mb-2">
                          <video
                            src={status.url}
                            controls
                            className="max-w-full h-auto rounded-lg border border-border"
                          />
                        </div>
                      )}
                      
                      {status.caption && (
                        <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                          {status.caption}
                        </p>
                      )}
                    </div>

                    {/* Reaction button */}
                    <div className="flex-shrink-0">
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
                                      setSelectedEmoji(prev => ({ ...prev, [status.id]: emoji }));
                                      handleReaction(status.id, emoji);
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
                                          setSelectedEmoji(prev => ({ ...prev, [status.id]: emoji }));
                                          handleReaction(status.id, emoji);
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
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusDetail;

