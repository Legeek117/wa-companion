import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { StatsCard } from "@/components/StatsCard";
import { MessageSquare, Send, Users, Crown, Search, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAutoresponder } from "@/hooks/useAutoresponder";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";

const Autoresponder = () => {
  const { user } = useAuth();
  const { config, activeMode, isLoading, updateConfig, updateContact, isUpdating, isPremium, refetchContacts } = useAutoresponder();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const offlineConfig = config?.configs.find((c) => c.mode === 'offline');
  const busyConfig = config?.configs.find((c) => c.mode === 'busy');
  
  const [offlineMode, setOfflineMode] = useState(offlineConfig?.enabled || false);
  const [busyMode, setBusyMode] = useState(busyConfig?.enabled || false);
  const [offlineMessage, setOfflineMessage] = useState(offlineConfig?.message || '');
  const [busyMessage, setBusyMessage] = useState(busyConfig?.message || '');

  useEffect(() => {
    if (offlineConfig) {
      setOfflineMode(offlineConfig.enabled);
      setOfflineMessage(offlineConfig.message);
    }
    if (busyConfig) {
      setBusyMode(busyConfig.enabled);
      setBusyMessage(busyConfig.message);
    }
  }, [offlineConfig, busyConfig]);

  const defaultOfflineMessage = offlineConfig?.message || `🤖 Répondeur automatique

Bonjour ! Je ne suis pas disponible pour le moment.
Laissez-moi un message, je vous répondrai dès que possible.

Merci de votre compréhension !`;

  const defaultBusyMessage = busyConfig?.message || `⏰ Mode Occupé

Je suis actuellement occupé(e) et ne peux pas répondre.
Je reviendrai vers vous dès que possible.

Merci de patienter !`;

    const contacts = config?.contacts || [];
    const [searchQuery, setSearchQuery] = useState("");
    const [localContacts, setLocalContacts] = useState(contacts);

    // Update local contacts when config changes
    useEffect(() => {
      console.log('[Autoresponder] Config contacts changed:', {
        contactsCount: config?.contacts?.length || 0,
        isPremium: isPremium,
        isLoading,
        contacts: config?.contacts,
      });
      setLocalContacts(config?.contacts || []);
    }, [config?.contacts, isPremium, isLoading]);

  // Log contacts for debugging
  useEffect(() => {
    console.log('[Autoresponder] Contacts state:', {
      contactsCount: contacts.length,
      localContactsCount: localContacts.length,
      isPremium,
      isLoading,
    });
  }, [contacts, localContacts, isPremium, isLoading]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return localContacts;
    const query = searchQuery.toLowerCase();
    return localContacts.filter(
      (contact) =>
        contact.contact_name.toLowerCase().includes(query) ||
        contact.contact_id.toLowerCase().includes(query)
    );
  }, [localContacts, searchQuery]);

  const handleContactToggle = (contactId: string, enabled: boolean) => {
    const contact = localContacts.find((c) => c.contact_id === contactId);
    if (contact) {
      updateContact({
        contactId,
        contactName: contact.contact_name,
        enabled,
      });
      
      // Update local state optimistically
      setLocalContacts(
        localContacts.map((c) =>
          c.contact_id === contactId ? { ...c, enabled } : c
        )
      );
    }
  };

  const handleEnableAll = () => {
    localContacts.forEach((contact) => {
      if (!contact.enabled) {
        updateContact({
          contactId: contact.contact_id,
          contactName: contact.contact_name,
    enabled: true,
        });
      }
    });
    
    // Update local state optimistically
    setLocalContacts(
      localContacts.map((c) => ({ ...c, enabled: true }))
    );
    toast.success("Tous les contacts ont été activés");
  };

  const handleDisableAll = () => {
    localContacts.forEach((contact) => {
      if (contact.enabled) {
        updateContact({
          contactId: contact.contact_id,
          contactName: contact.contact_name,
          enabled: false,
        });
      }
    });
    
    // Update local state optimistically
    setLocalContacts(
      localContacts.map((c) => ({ ...c, enabled: false }))
    );
    toast.success("Tous les contacts ont été désactivés");
  };

  const handleOfflineToggle = (enabled: boolean) => {
    setOfflineMode(enabled);
    updateConfig({ mode: 'offline', enabled, message: offlineMessage });
    toast.success(enabled ? 'Mode Hors Ligne activé' : 'Mode Hors Ligne désactivé');
  };

  const handleBusyToggle = (enabled: boolean) => {
    setBusyMode(enabled);
    updateConfig({ mode: 'busy', enabled, message: busyMessage });
    toast.success(enabled ? 'Mode Occupé activé' : 'Mode Occupé désactivé');
  };

  const handleMessageUpdate = (mode: string, message: string) => {
    if (mode === 'offline') {
      setOfflineMessage(message);
      if (offlineMode) {
        updateConfig({ mode: 'offline', enabled: true, message });
      }
    } else {
      setBusyMessage(message);
      if (busyMode) {
        updateConfig({ mode: 'busy', enabled: true, message });
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Répondeur Automatique</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez vos réponses automatiques intelligentes</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge plan={isPremium ? 'premium' : 'free'} />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))
        ) : (
          <>
            <StatsCard
              title="Mode actif"
              value={activeMode ? activeMode.mode : 'Aucun'}
              icon={MessageSquare}
              description={activeMode ? 'Répondeur actif' : 'Aucun mode activé'}
            />
            <StatsCard
              title="Contacts configurés"
              value={contacts.length.toString()}
              icon={Users}
              description={isPremium ? 'Filtrage activé' : 'Tous les contacts'}
            />
            <StatsCard
              title="Plan"
              value={isPremium ? 'Premium' : 'Gratuit'}
              icon={Send}
              description={isPremium ? 'Fonctionnalités complètes' : 'Fonctionnalités limitées'}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">🔴 Mode Hors Ligne</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Active automatiquement quand déconnecté</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <Label htmlFor="offline" className="text-sm">État</Label>
              <span className={`text-xs sm:text-sm font-medium ${offlineMode ? "text-primary" : "text-muted-foreground"}`}>
                {offlineMode ? "Activé" : "Désactivé"}
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Message {!isPremium && <span className="text-xs text-muted-foreground">🔒 Non modifiable</span>}</Label>
              <Textarea
                value={offlineMessage || defaultOfflineMessage}
                disabled={!isPremium || isUpdating}
                onChange={(e) => handleMessageUpdate('offline', e.target.value)}
                rows={6}
                className={`text-sm sm:min-h-[140px] ${!isPremium ? "bg-muted cursor-not-allowed" : ""}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">🟡 Mode Occupé</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Activation manuelle via toggle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <Label htmlFor="busy" className="text-sm">Activer Mode Occupé</Label>
              <Switch
                id="busy"
                checked={busyMode}
                disabled={isUpdating}
                onCheckedChange={handleBusyToggle}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Message {!isPremium && <span className="text-xs text-muted-foreground">🔒 Non modifiable</span>}</Label>
              <Textarea
                value={busyMessage || defaultBusyMessage}
                disabled={!isPremium || isUpdating}
                onChange={(e) => handleMessageUpdate('busy', e.target.value)}
                rows={6}
                className={`text-sm sm:min-h-[140px] ${!isPremium ? "bg-muted cursor-not-allowed" : ""}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {!isLoading && !isPremium && (
        <Card className="border-premium bg-premium/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Crown className="w-12 h-12 text-premium flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <h3 className="text-xl font-bold">Passez à Premium pour débloquer :</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-premium" />
                    ✏️ Messages personnalisables avec variables dynamiques
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-premium" />
                    🎯 Filtrage par contact (choisir qui reçoit la réponse)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-premium" />
                    ⏰ Planification horaire automatique
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-premium" />
                    🎭 Modes multiples et réponses conditionnelles
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-premium" />
                    📊 Statistiques détaillées et analytics
                  </li>
                </ul>
                <Button className="bg-premium mt-4" onClick={() => navigate('/dashboard/upgrade')}>
                  Passer à Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && isPremium && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Filtrage des Destinataires</CardTitle>
            <CardDescription>Choisissez qui reçoit les réponses automatiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEnableAll}
                  disabled={isUpdating}
                >
                  Activer Tout
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDisableAll}
                  disabled={isUpdating}
                >
                  Désactiver Tout
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
            <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium mb-2">Aucun contact trouvé</p>
                  <p className="text-sm mb-4">
                    {searchQuery 
                      ? "Aucun contact ne correspond à votre recherche"
                      : "Les contacts apparaîtront ici après avoir reçu des messages. Les contacts sont automatiquement ajoutés quand vous recevez un message."}
                  </p>
                     {!searchQuery && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           // Force refetch of contacts
                           refetchContacts();
                           queryClient.invalidateQueries({ queryKey: ['autoresponder', 'config', user?.id] });
                         }}
                       >
                         <RefreshCw className="w-3 h-3 mr-1" />
                         Actualiser
                       </Button>
                     )}
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.contact_id}
                    className="flex items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.contact_name}`} />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {contact.contact_name[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {contact.contact_name}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {contact.contact_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {contact.enabled ? "✅ Réponse automatique activée" : "❌ Pas de réponse automatique"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={contact.enabled ?? true}
                      onCheckedChange={(checked) => handleContactToggle(contact.contact_id, checked)}
                      disabled={isUpdating}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Autoresponder;
