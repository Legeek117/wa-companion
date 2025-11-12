import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { User, Bot, Smartphone, CreditCard, Settings as SettingsIcon, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Skeleton } from "@/components/ui/skeleton";

const Settings = () => {
  const { user, isPremium } = useAuth();
  const { status: whatsappStatus, isConnected, isConnecting, getQR, getPairingCode, disconnect, isGettingQR, isGettingPairingCode, isDisconnecting, refetch: refetchWhatsAppStatus } = useWhatsApp();

  const handleSave = () => {
    toast.success("Paramètres enregistrés !");
  };


  const handleDisconnect = () => {
    if (confirm("Êtes-vous sûr de vouloir déconnecter WhatsApp ?")) {
      disconnect();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Paramètres</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Gérez votre compte et vos préférences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2 h-auto">
          <TabsTrigger value="account" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Compte</span>
          </TabsTrigger>
          <TabsTrigger value="bot" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Bot</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Smartphone className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Abonnement</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Préférences</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Informations Personnelles</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Gérez vos informations de compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-sm sm:text-base">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">Changer la photo</Button>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname" className="text-sm">Prénom</Label>
                  <Input id="firstname" defaultValue={user?.email?.split('@')[0] || ''} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname" className="text-sm">Nom</Label>
                  <Input id="lastname" defaultValue="" className="text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email || ''} className="text-sm" disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Téléphone</Label>
                <Input id="phone" type="tel" placeholder="+226 XX XX XX XX" className="text-sm" />
              </div>

              <Button onClick={handleSave} className="w-full sm:w-auto text-xs sm:text-sm">Enregistrer les modifications</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Bot</CardTitle>
              <CardDescription>Personnalisez votre bot WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botname">Nom du Bot</Label>
                <Input id="botname" defaultValue="Mon Bot WhatsApp" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="botbio">Bio/Description</Label>
                <Input id="botbio" defaultValue="Bot multifonctions automatisé" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm">Notifications Push</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Recevoir des notifications pour les événements importants
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button onClick={handleSave}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connexion WhatsApp</CardTitle>
              <CardDescription>Gérez la connexion de votre compte WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-green-600">✓ Connecté</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {whatsappStatus?.lastSeen 
                        ? `Dernière activité : ${new Date(whatsappStatus.lastSeen).toLocaleString('fr-FR')}`
                        : 'Connecté'}
                    </p>
                  </div>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                </div>
              ) : isConnecting ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-yellow-600">Connexion en cours...</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Génération du QR code...</p>
                  </div>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-red-600">Non connecté</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Connectez votre WhatsApp pour commencer</p>
                  </div>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full flex-shrink-0" />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <p className="text-sm font-medium">Connexion WhatsApp</p>
                  {!isConnected && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          console.log('[Settings] QR Code button clicked');
                          try {
                            await getQR();
                            // Immediately refetch status to get the QR code
                            setTimeout(() => {
                              refetchWhatsAppStatus();
                            }, 1000);
                          } catch (error) {
                            console.error('[Settings] Error getting QR code:', error);
                          }
                        }}
                        disabled={isGettingQR || isGettingPairingCode}
                        className="text-xs sm:text-sm"
                      >
                        {isGettingQR ? 'Génération...' : 'QR Code'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={async () => {
                          console.log('[Settings] Pairing Code button clicked');
                          try {
                            await getPairingCode();
                            // Immediately refetch status to get the pairing code
                            setTimeout(() => {
                              refetchWhatsAppStatus();
                            }, 1000);
                          } catch (error) {
                            console.error('[Settings] Error getting pairing code:', error);
                          }
                        }}
                        disabled={isGettingQR || isGettingPairingCode}
                        className="text-xs sm:text-sm"
                      >
                        {isGettingPairingCode ? 'Génération...' : 'Code de Couplage'}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Pairing Code Display */}
                {whatsappStatus?.pairingCode && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium mb-2 text-center">Code de Couplage</p>
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold tracking-wider mb-2">
                        {whatsappStatus.pairingCode}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Entrez ce code dans WhatsApp → Paramètres → Appareils liés → Lier un appareil
                      </p>
                    </div>
                  </div>
                )}

                {/* QR Code Display */}
                <div className="aspect-square max-w-xs mx-auto bg-muted rounded-lg flex items-center justify-center p-4">
                  {(isGettingQR || isGettingPairingCode) || (isConnecting && !whatsappStatus?.qrCode && !whatsappStatus?.pairingCode) ? (
                    <div className="text-center w-full">
                      <Skeleton className="w-32 h-32 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Génération en cours...</p>
                    </div>
                  ) : whatsappStatus?.qrCode ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {whatsappStatus.qrCode.startsWith('data:image') ? (
                        <img 
                          src={whatsappStatus.qrCode} 
                          alt="QR Code WhatsApp" 
                          className="w-full h-full object-contain rounded-lg"
                          onError={(e) => {
                            console.error('Error loading QR code image:', e);
                            toast.error('Erreur lors du chargement du QR code');
                          }}
                          onLoad={() => {
                            console.log('[Settings] QR code image loaded successfully');
                          }}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-sm text-muted-foreground mb-2">QR code invalide</p>
                          <p className="text-xs text-muted-foreground">Format: {whatsappStatus.qrCode.substring(0, 50)}...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground text-sm mb-2">Cliquez sur un bouton pour commencer</p>
                      <p className="text-xs text-muted-foreground">QR Code ou Code de Couplage</p>
                    </div>
                  )}
                </div>
                {whatsappStatus?.qrCode && !whatsappStatus?.pairingCode && (
                  <p className="text-xs text-center text-muted-foreground">
                    Scannez ce QR code avec votre application WhatsApp
                  </p>
                )}
              </div>

              {isConnected && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? 'Déconnexion...' : 'Déconnecter WhatsApp'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mon Abonnement</CardTitle>
              <CardDescription>Gérez votre plan et facturation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Plan Actuel</p>
                  <p className="text-sm text-muted-foreground">{isPremium ? 'Premium' : 'Gratuit'}</p>
                </div>
                <PlanBadge plan={user?.plan} />
              </div>

              <Button className="w-full bg-premium">
                Passer à Premium - 7,99€/mois
              </Button>

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">Historique des paiements</h3>
                <p className="text-sm text-muted-foreground">Aucune transaction</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Préférences</CardTitle>
              <CardDescription>Personnalisez votre expérience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <Input defaultValue="Français" />
              </div>

              <div className="space-y-2">
                <Label>Fuseau Horaire</Label>
                <Input defaultValue="GMT+0 (Ouagadougou)" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm">Thème Sombre</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Activer le mode sombre
                  </p>
                </div>
                <Switch />
              </div>

              <Button onClick={handleSave}>Enregistrer</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Protégez votre compte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Changer le mot de passe</Label>
                <Input type="password" placeholder="Nouveau mot de passe" />
              </div>

              <Button>Mettre à jour le mot de passe</Button>

              <div className="pt-4 border-t space-y-4">
                <Button variant="outline" className="w-full">
                  Télécharger mes données (RGPD)
                </Button>
                <Button variant="destructive" className="w-full">
                  Supprimer mon compte
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
