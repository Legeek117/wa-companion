import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { Search, Crown, Eye, Heart, Plus, X, RefreshCw, Users } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useStatus, StatusContactConfig } from "@/hooks/useStatus";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const StatusConfig = () => {
  const { user, isPremium } = useAuth();
  const { config, isLoading, updateConfig, isUpdating } = useStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<StatusContactConfig[]>([]);
  const [localContacts, setLocalContacts] = useState<StatusContactConfig[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const previousContactsRef = useRef<string>('');

  // Fetch contacts from status likes (for premium users)
  const { data: fetchedContacts, refetch: refetchContacts, isLoading: isLoadingFetchedContacts, error: contactsError } = useQuery({
    queryKey: ['status', 'contacts'],
    queryFn: async () => {
      const response = await api.status.getContacts();
      if (response.success && response.data) {
        console.log('[StatusConfig] Fetched contacts:', response.data);
        return response.data as StatusContactConfig[];
      }
      console.warn('[StatusConfig] Failed to fetch contacts:', response.error);
      return [];
    },
    enabled: isPremium,
    retry: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute to detect changes
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  // Log errors
  useEffect(() => {
    if (contactsError) {
      console.error('[StatusConfig] Error fetching contacts:', contactsError);
    }
  }, [contactsError]);

  // Initialize contacts from config or fetched contacts
  useEffect(() => {
    console.log('[StatusConfig] useEffect triggered:', {
      isLoading,
      isPremium,
      isLoadingFetchedContacts,
      fetchedContactsLength: fetchedContacts?.length,
      configContactsLength: config?.contacts?.length,
    });

    // Skip if still loading
    if (isLoading || (isPremium && isLoadingFetchedContacts)) {
      console.log('[StatusConfig] Still loading, skipping update');
      return;
    }

    if (!isPremium) {
      // For free users, just use config contacts
      const configContacts = config?.contacts || [];
      const configContactsStr = JSON.stringify(configContacts);
      if (configContactsStr !== previousContactsRef.current) {
        console.log('[StatusConfig] Setting free user contacts:', configContacts.length);
        setContacts(configContacts);
        setLocalContacts(configContacts);
        previousContactsRef.current = configContactsStr;
      }
      return;
    }

    // For premium users, merge config contacts with fetched contacts
    const configContacts = config?.contacts || [];
    const fetched = fetchedContacts || [];
    
    console.log('[StatusConfig] Merging contacts:', {
      configContactsCount: configContacts.length,
      fetchedCount: fetched.length,
      isPremium,
    });
    
    // If we have fetched contacts, use them (they come from status likes)
    if (fetched.length > 0) {
      // Build merged contacts list
      const configContactsMap = new Map(
        configContacts.map((c) => [c.contact_id, c])
      );
      
      // Start with fetched contacts (from status likes) - prioritize these
      const mergedContacts: StatusContactConfig[] = [];
      
      // Add fetched contacts first (from status likes)
      fetched.forEach((contact) => {
        const configContact = configContactsMap.get(contact.contact_id);
        if (configContact) {
          // Use config values if they exist
          mergedContacts.push({
            ...contact,
            enabled: configContact.enabled ?? contact.enabled,
            emoji: configContact.emoji || contact.emoji,
            action_type: configContact.action_type || contact.action_type,
            watch_only: configContact.watch_only ?? contact.watch_only,
          });
        } else {
          mergedContacts.push(contact);
        }
      });
      
      // Add any config contacts that aren't in fetched contacts
      configContacts.forEach((configContact) => {
        if (!fetched.find((c) => c.contact_id === configContact.contact_id)) {
          mergedContacts.push(configContact);
        }
      });
      
      console.log('[StatusConfig] Merged contacts count:', mergedContacts.length);
      
      // Always update if we have fetched contacts (they are the source of truth)
      const mergedStr = JSON.stringify(mergedContacts);
      if (mergedStr !== previousContactsRef.current) {
        console.log('[StatusConfig] Updating contacts:', mergedContacts.length);
        setContacts(mergedContacts);
        setLocalContacts(mergedContacts);
        previousContactsRef.current = mergedStr;
      } else {
        console.log('[StatusConfig] Contacts unchanged, skipping update');
      }
    } else if (configContacts.length > 0) {
      // If no fetched contacts but we have config contacts, use them
      const configContactsStr = JSON.stringify(configContacts);
      if (configContactsStr !== previousContactsRef.current) {
        console.log('[StatusConfig] Using config contacts:', configContacts.length);
        setContacts(configContacts);
        setLocalContacts(configContacts);
        previousContactsRef.current = configContactsStr;
      }
    }
  }, [config?.contacts, fetchedContacts, isPremium, isLoading, isLoadingFetchedContacts]); // Only depend on the contacts array, not the whole config object

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    console.log('[StatusConfig] Filtering contacts:', {
      localContactsCount: localContacts.length,
      searchQuery,
    });
    if (!searchQuery.trim()) return localContacts;
    const query = searchQuery.toLowerCase();
    const filtered = localContacts.filter(
      (contact) =>
        contact.contact_name.toLowerCase().includes(query) ||
        contact.contact_id.toLowerCase().includes(query)
    );
    console.log('[StatusConfig] Filtered contacts count:', filtered.length);
    return filtered;
  }, [localContacts, searchQuery]);

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

  const handleContactToggle = (contactId: string, enabled: boolean) => {
    const updated = localContacts.map((contact) =>
      contact.contact_id === contactId
        ? { ...contact, enabled, watch_only: enabled ? false : contact.watch_only }
        : contact
    );
    setLocalContacts(updated);
  };

  const handleContactWatchOnly = (contactId: string, watchOnly: boolean) => {
    const updated = localContacts.map((contact) =>
      contact.contact_id === contactId
        ? { ...contact, watch_only: watchOnly, enabled: watchOnly ? false : contact.enabled }
        : contact
    );
    setLocalContacts(updated);
  };

  const handleContactEmojiChange = (contactId: string, emoji: string) => {
    const updated = localContacts.map((contact) =>
      contact.contact_id === contactId ? { ...contact, emoji } : contact
    );
    setLocalContacts(updated);
  };

  const handleContactActionTypeChange = (contactId: string, actionType: 'view_only' | 'view_and_like') => {
    const updated = localContacts.map((contact) =>
      contact.contact_id === contactId ? { ...contact, action_type: actionType } : contact
    );
    setLocalContacts(updated);
  };

  const handleSave = async () => {
    if (!isPremium) {
      toast.error("Cette fonctionnalité est réservée aux membres Premium");
      return;
    }

    if (!config) {
      toast.error("Configuration non disponible");
      return;
    }

    if (isUpdating) {
      toast.info("Sauvegarde en cours...");
      return;
    }

    try {
      // Transform contacts to match backend format
      const contactsToSave: StatusContactConfig[] = localContacts.map((contact) => ({
        contact_id: contact.contact_id,
        contact_name: contact.contact_name,
        enabled: contact.enabled || false,
        emoji: contact.emoji || '❤️',
        action_type: contact.action_type || 'view_and_like',
        watch_only: contact.watch_only || false,
      }));

      console.log('[StatusConfig] Saving config with contacts:', contactsToSave.length);
      
      // Use updateConfig with callbacks
      updateConfig(
        {
          enabled: config.enabled,
          actionType: config.actionType,
          defaultEmoji: config.defaultEmoji,
          contacts: contactsToSave,
        },
        {
          onSuccess: () => {
            console.log('[StatusConfig] Config saved successfully');
            toast.success("Configuration sauvegardée avec succès");
          },
          onError: (error: Error) => {
            console.error('[StatusConfig] Error saving config:', error);
            toast.error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}`);
          },
        }
      );
    } catch (error) {
      console.error('[StatusConfig] Error in handleSave:', error);
      toast.error(`Erreur lors de la sauvegarde: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleLoadContacts = async () => {
    if (!isPremium) {
      toast.error("Cette fonctionnalité est réservée aux membres Premium");
      return;
    }

    setIsLoadingContacts(true);
    try {
      await refetchContacts();
      toast.success("Contacts chargés depuis les statuts likés");
    } catch (error) {
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleEnableAll = () => {
    if (!isPremium) {
      toast.error("Cette fonctionnalité est réservée aux membres Premium");
      return;
    }

    if (localContacts.length === 0) {
      toast.info("Aucun contact à activer");
      return;
    }

    console.log('[StatusConfig] Enabling all contacts:', localContacts.length);
    const updated = localContacts.map((contact) => ({
      ...contact,
      enabled: true,
      watch_only: false,
    }));
    setLocalContacts(updated);
    toast.success(`${updated.length} contact(s) activé(s)`);
  };

  const handleDisableAll = () => {
    if (!isPremium) {
      toast.error("Cette fonctionnalité est réservée aux membres Premium");
      return;
    }

    if (localContacts.length === 0) {
      toast.info("Aucun contact à désactiver");
      return;
    }

    console.log('[StatusConfig] Disabling all contacts:', localContacts.length);
    const updated = localContacts.map((contact) => ({
      ...contact,
      enabled: false,
      watch_only: false,
    }));
    setLocalContacts(updated);
    toast.success(`${updated.length} contact(s) désactivé(s)`);
  };

  if (!isPremium) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Configuration Avancée</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Personnalisez le traitement des statuts par contact</p>
          </div>
          <div className="flex-shrink-0">
            <PlanBadge plan={user?.plan || 'free'} />
          </div>
        </div>

        <Card className="border-premium">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center space-y-3 sm:space-y-4 py-6 sm:py-8 px-4">
              <Crown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-premium" />
              <h3 className="text-xl sm:text-2xl font-bold">Fonctionnalité Premium</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                La configuration avancée des statuts par contact est réservée aux membres Premium.
                Personnalisez vos réactions et filtrez les contacts pour chaque contact individuellement.
              </p>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 mt-4 text-left max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                    <Heart className="w-4 h-4 text-premium" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Emoji personnalisé par contact</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Choisissez un emoji différent pour chaque contact</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                    <Eye className="w-4 h-4 text-premium" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Filtrage avancé</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Sélectionnez quels contacts traiter</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                    <Crown className="w-4 h-4 text-premium" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Configuration par contact</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Paramétrez chaque contact individuellement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-premium/20 p-2 flex-shrink-0">
                    <Plus className="w-4 h-4 text-premium" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Mode "Vu uniquement"</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Marquez comme vu sans liker</p>
                  </div>
                </div>
              </div>
              <div className="pt-3 sm:pt-4">
                <Button 
                  className="bg-premium hover:bg-premium/90 text-xs sm:text-sm w-full sm:w-auto"
                  onClick={() => window.location.href = '/dashboard/upgrade'}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Passer à Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Configuration Avancée</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Personnalisez le traitement des statuts par contact</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge plan="premium" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Contacts</CardTitle>
          <CardDescription>
            Activez/Désactivez le traitement des statuts et personnalisez l'emoji et l'action par contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher un contact..."
                className="pl-10 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs sm:text-sm flex-1 sm:flex-none" 
                onClick={handleLoadContacts}
                disabled={isLoadingContacts}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                Charger les contacts
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={handleEnableAll}>
                Tout activer
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none" onClick={handleDisableAll}>
                Tout désactiver
              </Button>
              <Button 
                size="sm" 
                className="text-xs sm:text-sm flex-1 sm:flex-none bg-primary hover:bg-primary/90"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading || (isPremium && isLoadingFetchedContacts) ? (
          <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-2">Aucun contact trouvé</p>
                <p className="text-sm mb-4">
                  {isPremium 
                    ? "Les contacts apparaîtront ici après avoir liké leurs statuts. Cliquez sur le bouton ci-dessous pour charger les contacts depuis vos statuts likés."
                    : "Les contacts apparaîtront ici après avoir configuré des contacts spécifiques."}
                </p>
                {isPremium && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLoadContacts}
                    disabled={isLoadingContacts}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                    Charger depuis les statuts likés
                  </Button>
                )}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.contact_id}
                  className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.contact_name}`} />
                      <AvatarFallback className="text-xs sm:text-sm">{contact.contact_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{contact.contact_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{contact.contact_id}</p>
                  </div>
                </div>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Toggles Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
                      {/* Watch Only Toggle */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={contact.watch_only || false}
                          onCheckedChange={(checked) => handleContactWatchOnly(contact.contact_id, checked)}
                          disabled={isUpdating}
                        />
                        <Label className="text-xs sm:text-sm cursor-pointer">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          Marquer comme vu uniquement
                        </Label>
                      </div>

                      {/* Enable Toggle */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={contact.enabled || false}
                          onCheckedChange={(checked) => handleContactToggle(contact.contact_id, checked)}
                          disabled={isUpdating || contact.watch_only}
                        />
                        <Label className="text-xs sm:text-sm cursor-pointer">
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          Activer le traitement
                        </Label>
                      </div>

                      {/* Action Type Select */}
                      {contact.enabled && !contact.watch_only && (
                        <div className="flex items-center gap-2 min-w-[200px]">
                          <Label className="text-xs sm:text-sm whitespace-nowrap">Action:</Label>
                          <Select
                            value={contact.action_type || 'view_and_like'}
                            onValueChange={(value: 'view_only' | 'view_and_like') =>
                              handleContactActionTypeChange(contact.contact_id, value)
                            }
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="h-8 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view_only">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-3 h-3" />
                                  <span>Vu uniquement</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="view_and_like">
                                <div className="flex items-center gap-2">
                                  <Heart className="w-3 h-3" />
                                  <span>Vu et liker</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Emoji Selector */}
                    {contact.enabled && !contact.watch_only && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                        <Label className="text-xs sm:text-sm whitespace-nowrap">Emoji:</Label>
                        <div className="flex flex-wrap gap-1 max-w-full overflow-x-auto">
                          {emojis.map((emoji, index) => (
                            <Button
                              key={`emoji-${contact.contact_id}-${index}-${emoji}`}
                              variant={contact.emoji === emoji ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleContactEmojiChange(contact.contact_id, emoji)}
                              disabled={isUpdating}
                              className="text-lg sm:text-xl h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0"
                            >
                              {emoji}
                  </Button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusConfig;
