import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Heart, Image, Video, FileText, Play, Eye, Crown, Lock, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useStatus } from "@/hooks/useStatus";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const API_URL = import.meta.env.VITE_API_URL || 'https://amda-backend-3aji.onrender.com';

const buildMediaUrl = (mediaUrl: string) => {
  if (mediaUrl.startsWith('http')) {
    return mediaUrl;
  }
  return `${API_URL}${mediaUrl}`;
};

const StatusList = () => {
  const { likes, isLoading, likeStatus, isLiking } = useStatus();
  const { isPremium, user } = useAuth();
  const { isConnected, status: whatsappStatus } = useWhatsApp();
  const navigate = useNavigate();
  const [selectedEmoji, setSelectedEmoji] = useState<{ [key: string]: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track which statuses are being refetched
  const queryClient = useQueryClient();
  const isRefetching = queryClient.isFetching({ queryKey: ['status', 'likes', user?.id] }) > 0;

  // Grouper les statuts par contact
  const groupedByContact = useMemo(() => {
    if (!likes || likes.length === 0) return {};
    
    const grouped: { [key: string]: any[] } = {};
    
    likes.forEach((like: any) => {
      const contactName = like.contact_name || like.contact_id?.split('@')[0] || "Contact inconnu";
      const displayName = contactName.includes('@') ? contactName.split('@')[0] : contactName;
      const contactKey = like.contact_id || displayName;
      
      if (!grouped[contactKey]) {
        grouped[contactKey] = [];
      }
      grouped[contactKey].push({
        ...like,
        displayName,
        contactKey
      });
    });
    
    // Trier chaque groupe par date (plus récent en premier)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const dateA = new Date(a.liked_at || a.created_at);
        const dateB = new Date(b.liked_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
    });
    
    return grouped;
  }, [likes]);

  // Filtrer les contacts selon la recherche
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return groupedByContact;
    
    const query = searchQuery.toLowerCase();
    const filtered: { [key: string]: any[] } = {};
    
    Object.keys(groupedByContact).forEach(contactKey => {
      const statuses = groupedByContact[contactKey];
      const firstStatus = statuses[0];
      const displayName = firstStatus?.displayName || "";
      
      if (displayName.toLowerCase().includes(query) || 
          contactKey.toLowerCase().includes(query)) {
        filtered[contactKey] = statuses;
      }
    });
    
    return filtered;
  }, [groupedByContact, searchQuery]);

  const emojis = [
    // Coeurs et amour (24 emojis)
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "🩵", "🩷", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌",
    // Visages positifs et heureux (24 emojis)
    "😊", "😍", "🥰", "😘", "😗", "😙", "😚", "☺️", "🙂", "🤗", "🤩", "😎", "🤓", "🧐", "😇", "🥳", "😋", "😛", "🤪", "😜", "😝", "🤑", "🤣", "😂",
    // Visages neutres et pensifs (15 emojis)
    "😐", "😑", "😶", "🤐", "🤫", "🤔", "🤨", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪",
    // Visages tristes et négatifs (28 emojis)
    "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬",
    // Autres visages et expressions (23 emojis)
    "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "😶‍🌫️", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖",
    // Animaux (chat) (9 emojis)
    "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
    // Gestes et mains (30 emojis)
    "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "🤲", "🤝", "🙏", "✍️", "💪", "🦾", "🦿",
    // Parties du corps et expressions (13 emojis)
    "🦵", "🦶", "👂", "🦻", "👃", "🧠", "👀", "👁️", "👅", "👄", "💋", "🫦", "🫂",
    // Symboles et objets populaires (27 emojis)
    "🔥", "💯", "✨", "🌟", "⭐", "💫", "⚡", "💥", "💢", "💦", "💨", "💣", "💬", "💭", "🗯️", "💤", "🕳️", "👣", "💎", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉",
    // Emojis supplémentaires (lune et soleil) (7 emojis)
    "🌝", "🌚", "🌞", "🌛", "🌜", "🌙", "☀️",
  ].filter((emoji, index, self) => self.indexOf(emoji) === index); // Supprimer les doublons

  const handleLike = (contactId: string, statusId: string, contactName: string, emoji: string = "❤️") => {
    console.log('[StatusList] Attempting to like status:', { contactId, statusId, emoji, contactName });
    
    // Check if WhatsApp is connected first
    if (!isConnected) {
      console.warn('[StatusList] WhatsApp not connected, cannot like status');
      toast.error("WhatsApp n'est pas connecté. Veuillez connecter votre compte WhatsApp d'abord.", {
        action: {
          label: "Se connecter",
          onClick: () => navigate('/dashboard/whatsapp'),
        },
        duration: 5000,
      });
      return;
    }
    
    if (!statusId) {
      toast.error("Erreur: ID du statut manquant");
      return;
    }
    
    if (!contactId) {
      toast.error("Erreur: ID du contact manquant");
      return;
    }
    
    likeStatus(
      { contactId, statusId, emoji },
      {
        onSuccess: () => {
          console.log('[StatusList] Status liked successfully:', { contactId, statusId, emoji });
          toast.success(`Status de ${contactName} liké avec ${emoji} !`);
        },
        onError: (error: any) => {
          console.error('[StatusList] Error liking status:', error);
          const errorMessage = error?.message || "Impossible de liker le status";
          
          // Provide helpful error messages based on error type
          if (errorMessage.includes('not connected') || errorMessage.includes('connection lost')) {
            toast.error("WhatsApp n'est pas connecté. Veuillez reconnecter votre compte.", {
              action: {
                label: "Reconnecter",
                onClick: () => navigate('/dashboard/whatsapp'),
              },
              duration: 5000,
            });
          } else if (
            errorMessage.includes('expiré') || 
            errorMessage.includes('plus disponible') || 
            errorMessage.includes('expired') || 
            errorMessage.includes('not found') ||
            error?.error?.isExpired
          ) {
            // Status has expired or been deleted - refresh the list to remove it
            toast.error("Ce statut a expiré ou n'est plus disponible. La liste va être mise à jour.", {
              duration: 3000,
            });
            // Invalidate and refetch the status list to remove expired statuses
            // This will trigger the automatic refetch due to refetchInterval
            queryClient.invalidateQueries({ queryKey: ['status', 'likes', user?.id] });
          } else {
            toast.error(`Erreur: ${errorMessage}`);
          }
        },
      }
    );
  };

  const getEmojiForStatus = (statusId: string) => {
    return selectedEmoji[statusId] || "❤️";
  };

  const setEmojiForStatus = (statusId: string, emoji: string) => {
    setSelectedEmoji(prev => ({ ...prev, [statusId]: emoji }));
  };

  const formatTimestamp = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: fr,
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Historique des status likés</p>
        </div>
        {isLoading ? (
          <Loading text="Chargement des statuts..." showLogo={true} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Aucun statut liké</p>
            <p className="text-sm">Les statuts likés apparaîtront ici</p>
          </div>
        )}
      </div>
    );
  }

  if (!likes || likes.length === 0) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Historique des status likés</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun status liké pour le moment</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les status likés automatiquement apparaîtront ici
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStatuses = Object.values(filteredContacts).reduce((sum, statuses) => sum + statuses.length, 0);
  const totalContacts = Object.keys(filteredContacts).length;

  return (
    <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
            {isRefetching && (
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {totalContacts} contact{totalContacts > 1 ? 's' : ''} • {totalStatuses} statut{totalStatuses > 1 ? 's' : ''} liké{totalStatuses > 1 ? 's' : ''}
            {isRefetching && <span className="ml-2 text-xs">• Mise à jour...</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!isPremium && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Premium requis pour réagir</span>
            </div>
          )}
          {isPremium && !isConnected && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>WhatsApp non connecté</span>
            </div>
          )}
          {isPremium && isConnected && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>WhatsApp connecté</span>
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Rechercher un contact..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Liste groupée par contact */}
      <div className="space-y-6">
        {Object.keys(filteredContacts).length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun contact trouvé</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery ? 'Essayez une autre recherche' : 'Aucun statut liké pour le moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.keys(filteredContacts).map((contactKey) => {
            const statuses = filteredContacts[contactKey];
            const firstStatus = statuses[0];
            const displayName = firstStatus?.displayName || "Contact inconnu";
            
            return (
              <div key={contactKey} className="space-y-3">
                {/* En-tête du contact */}
                <div className="flex items-center gap-3 pb-2 border-b">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
                    <AvatarFallback className="text-sm font-medium">
                      {displayName[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base sm:text-lg">{displayName}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {statuses.length} statut{statuses.length > 1 ? 's' : ''} liké{statuses.length > 1 ? 's' : ''}
                    </p>
                  </div>
      </div>

                {/* Statuts du contact */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {statuses.map((like: any) => {
                    const currentEmoji = getEmojiForStatus(like.status_id || like.id);
                    
                    return (
                      <Card key={like.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              {/* Status Preview */}
              {like.media_url ? (
                <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-black group">
                  {like.media_type === 'image' ? (
                    <img
                      src={buildMediaUrl(like.media_url)}
                      alt={`Status de ${displayName}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback si l'image ne charge pas
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="flex items-center justify-center h-full text-muted-foreground bg-muted/50">
                              <div class="text-center">
                                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p class="text-sm">Image non disponible</p>
                              </div>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : like.media_type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video
                        src={buildMediaUrl(like.media_url)}
                        className="w-full h-full object-cover"
                        controls={true}
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full p-3">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="secondary" className="text-xs bg-black/70 backdrop-blur-sm">
                      <Eye className="w-3 h-3 mr-1" />
                      Vu
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-64 sm:h-72 bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <div className="rounded-full bg-muted/50 p-6">
                      <Image className="w-12 h-12" />
                    </div>
                    <p className="text-sm font-medium">Aperçu du statut</p>
                    <p className="text-xs text-muted-foreground/70">Aucun média disponible</p>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="w-3 h-3 mr-1" />
                      Vu
                    </Badge>
                </div>
              </div>
              )}

              <CardContent className="p-3 sm:p-4 space-y-3">
                {/* Contact Info */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
                    <AvatarFallback className="text-sm font-medium">
                      {displayName[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(like.liked_at || like.created_at)}
                    </p>
                  </div>
                  </div>

                {/* Reaction Section */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      <span className="mr-1 text-base">{like.emoji_used || "❤️"}</span>
                      Liké
                    </Badge>
                </div>
                  
                  {isPremium ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm"
                          onClick={(e) => e.stopPropagation()}
                          disabled={!isConnected || isLiking}
                        >
                          <Heart className="w-3 h-3 mr-1" />
                          {isLiking ? "Envoi..." : "Réagir"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-2">
                          {!isConnected && (
                            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-400">
                              WhatsApp n'est pas connecté. Veuillez connecter votre compte pour réagir aux statuts.
                            </div>
                          )}
                          <p className="text-xs font-medium mb-2">Choisir une réaction</p>
                          <div className="grid grid-cols-6 gap-1">
                            {emojis.map((emoji, index) => (
                  <Button
                                key={`emoji-${index}-${emoji}`}
                                variant={currentEmoji === emoji ? "default" : "ghost"}
                    size="sm"
                                className="h-8 w-8 p-0 text-lg"
                                onClick={() => {
                                  if (isConnected) {
                                    const statusId = like.status_id || like.id;
                                    setEmojiForStatus(statusId, emoji);
                                    handleLike(like.contact_id, statusId, displayName, emoji);
                                  }
                                }}
                                disabled={!isConnected || isLiking}
                                title={!isConnected ? "WhatsApp n'est pas connecté" : ""}
                              >
                                {emoji}
                  </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span className="hidden sm:inline">Premium</span>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StatusList;
