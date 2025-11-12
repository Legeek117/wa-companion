import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, TrendingUp, Users, Clock, Eye, Crown, Sparkles, Lock, ArrowRight } from "lucide-react";
import { useStatus } from "@/hooks/useStatus";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loading } from "@/components/Loading";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const Status = () => {
  const { config, stats, isLoading, updateConfig, isUpdating } = useStatus();
  const { isPremium, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use config values directly - no need for local state that can get out of sync
  const autoLike = config?.enabled ?? false;
  const actionType = config?.actionType ?? 'view_and_like';
  const selectedEmoji = config?.defaultEmoji ?? '❤️';

  // Refresh config when user becomes premium
  useEffect(() => {
    if (isPremium && user) {
      // Invalidate status config to refetch with premium features
      queryClient.invalidateQueries({ queryKey: ['status', 'config', user.id] });
    }
  }, [isPremium, user, queryClient]);

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

  const handleEmojiChange = (emoji: string) => {
    if (!config || isUpdating) return;
    
    console.log('[Status] Changing emoji to:', emoji);
    
    // Send only the fields that need to be updated
    const updateData = {
      enabled: config.enabled,
      actionType: config.actionType,
      defaultEmoji: emoji, // This is the only field we're updating
    };
    
    updateConfig(updateData, {
      onSuccess: () => {
        console.log('[Status] Emoji updated successfully:', emoji);
        toast.success(`Emoji changé : ${emoji}`);
      },
      onError: (error: any) => {
        console.error('[Status] Error updating emoji:', error);
        toast.error(`Erreur lors du changement d'emoji: ${error?.message || 'Erreur inconnue'}`);
      },
    });
  };

  const handleActionTypeChange = (newActionType: 'view_only' | 'view_and_like') => {
    if (!config || isUpdating) return;
    
    console.log('[Status] Changing action type to:', newActionType);
    
    // Send only the fields that need to be updated
    const updateData = {
      enabled: config.enabled,
      actionType: newActionType, // This is the only field we're updating
      defaultEmoji: config.defaultEmoji,
    };
    
    updateConfig(updateData, {
      onSuccess: () => {
        console.log('[Status] Action type updated successfully:', newActionType);
        toast.success(
          newActionType === 'view_only' 
            ? 'Mode "Marquer comme vu uniquement" activé' 
            : 'Mode "Marquer comme vu et liker" activé'
        );
      },
      onError: (error: any) => {
        console.error('[Status] Error updating action type:', error);
        toast.error(`Erreur lors du changement de mode: ${error?.message || 'Erreur inconnue'}`);
      },
    });
  };

  const handleAutoLikeToggle = (enabled: boolean) => {
    if (!config || isUpdating) return;
    
    console.log('[Status] Toggling enabled to:', enabled);
    
    // Send only the fields that need to be updated
    const updateData = {
      enabled, // This is the only field we're updating
      actionType: config.actionType,
      defaultEmoji: config.defaultEmoji,
    };
    
    updateConfig(updateData, {
      onSuccess: () => {
        console.log('[Status] Enabled updated successfully:', enabled);
        toast.success(
          enabled 
            ? 'Traitement des statuts activé' 
            : 'Traitement des statuts désactivé'
        );
      },
      onError: (error: any) => {
        console.error('[Status] Error updating enabled:', error);
        toast.error(`Erreur lors du changement d'état: ${error?.message || 'Erreur inconnue'}`);
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Gestion des Status</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Gérez et automatisez vos interactions avec les status WhatsApp</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Loading key={index} text="Chargement..." showLogo={true} size="sm" />
          ))
        ) : (
          <>
            <StatsCard
              title="Likés aujourd'hui"
              value={stats.likedToday.toString()}
              icon={Heart}
              description="Status automatiques"
            />
            <StatsCard
              title="Cette semaine"
              value={stats.likedThisWeek.toString()}
              icon={TrendingUp}
              description="7 derniers jours"
            />
            <StatsCard
              title="Total likés"
              value={stats.totalLiked.toString()}
              icon={Users}
              description="Depuis le début"
            />
            <StatsCard
              title="Statut"
              value={autoLike ? "Activé" : "Désactivé"}
              icon={autoLike ? Eye : Clock}
              description={autoLike ? "Traitement actif" : "Traitement inactif"}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration des Status</CardTitle>
          <CardDescription>Paramétrez le traitement automatique des status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="auto-like" className="text-sm sm:text-base">Activer le traitement des statuts</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Traiter automatiquement tous les nouveaux status
              </p>
            </div>
            <Switch
              id="auto-like"
              checked={autoLike}
              disabled={isUpdating}
              onCheckedChange={handleAutoLikeToggle}
            />
          </div>

          {autoLike && (
            <>
              <div className="space-y-3">
                <Label htmlFor="action-type" className="text-sm sm:text-base">Type d'action</Label>
                <Select
                  value={actionType}
                  onValueChange={(value: 'view_only' | 'view_and_like') => handleActionTypeChange(value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="action-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view_only">
                      Marquer comme vu uniquement
                    </SelectItem>
                    <SelectItem value="view_and_like">
                      Marquer comme vu et liker
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {actionType === 'view_only' 
                    ? 'Les statuts seront marqués comme vus mais ne seront pas likés automatiquement'
                    : 'Les statuts seront marqués comme vus et likés avec l\'emoji sélectionné'}
                </p>
              </div>

              {actionType === 'view_and_like' && (
                <div className="space-y-3">
                  <Label className="text-sm sm:text-base">Emoji par défaut</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {emojis.map((emoji, index) => (
                      <Button
                        key={`emoji-${index}-${emoji}`}
                        variant={selectedEmoji === emoji ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleEmojiChange(emoji)}
                        disabled={isUpdating}
                        className="text-xl sm:text-2xl h-10 sm:h-12 md:h-14 p-0 aspect-square"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Premium Upgrade Card */}
      {!isPremium && (
        <Card className="border-premium bg-gradient-to-br from-premium/10 to-premium/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-premium/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-premium" />
              <CardTitle className="text-lg sm:text-xl">Passez à Premium</CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base">
              Débloquez des fonctionnalités avancées pour la gestion des statuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-premium" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">Configuration par contact</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Personnalisez les réactions et filtrez les contacts individuellement
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                  <Heart className="w-4 h-4 text-premium" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">Emoji personnalisé</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Choisissez un emoji différent pour chaque contact
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                  <Eye className="w-4 h-4 text-premium" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">Filtrage avancé</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Sélectionnez quels contacts traiter et lesquels ignorer
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                  <Lock className="w-4 h-4 text-premium" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">Mode "Vu uniquement"</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Marquez comme vu sans liker pour certains contacts
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard/upgrade')}
              className="w-full bg-premium hover:bg-premium/90 text-white"
              size="lg"
            >
              <Crown className="w-4 h-4 mr-2" />
              Passer à Premium
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Status;
