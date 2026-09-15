import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { User, Bot, Smartphone, CreditCard, Settings as SettingsIcon, Shield, Eye, Phone, KeyRound, Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { APP_VERSION_NAME, APP_VERSION_CODE } from "@/config/appVersion";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  backupPrivateKeyWithPassphrase,
  deletePrivateKeyBackup,
} from "@/lib/e2eCrypto";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

const Settings = () => {
  const { user, isPremium } = useAuth();
  const { status: whatsappStatus, isConnected, isConnecting, getQR, getPairingCode, disconnect, isGettingQR, isGettingPairingCode, isDisconnecting, refetch: refetchWhatsAppStatus } = useWhatsApp();
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // E2E key backup state
  const [hasBackup, setHasBackup] = useState<boolean | null>(null);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);
  const [isLoadingBackup, setIsLoadingBackup] = useState(true);
  
  // View Once command config
  const [viewOnceCommand, setViewOnceCommand] = useState('.vv');
  const [viewOnceEmoji, setViewOnceEmoji] = useState<string>('');
  const [viewOnceEnabled, setViewOnceEnabled] = useState(true);
  const [isLoadingCommandConfig, setIsLoadingCommandConfig] = useState(true);
  const [isSavingCommandConfig, setIsSavingCommandConfig] = useState(false);

  // App update check
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latest: { versionName: string; versionCode: number; downloadUrl: string; notes?: string | null };
  } | null>(null);

  // Push notification settings
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifNewMessage, setNotifNewMessage] = useState(true);
  const [notifViewOnce, setNotifViewOnce] = useState(true);
  const [notifDeletedMessage, setNotifDeletedMessage] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  useEffect(() => {
    api.notifications
      .getSettings()
      .then((res: any) => {
        if (res?.success && res.data) {
          setNotifEnabled(res.data.enabled !== false);
          setNotifNewMessage(res.data.newMessage !== false);
          setNotifViewOnce(res.data.viewOnce !== false);
          setNotifDeletedMessage(res.data.deletedMessage !== false);
        }
      })
      .catch((err: unknown) => console.warn('Failed to load notification settings:', err))
      .finally(() => setIsLoadingNotifications(false));
  }, []);

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const res: any = await api.notifications.updateSettings({
        enabled: notifEnabled,
        newMessage: notifNewMessage,
        viewOnce: notifViewOnce,
        deletedMessage: notifDeletedMessage,
      });
      if (res?.success) {
        toast.success('Préférences de notification enregistrées');
      } else {
        toast.error('Échec de la sauvegarde des préférences');
      }
    } catch {
      toast.error('Échec de la sauvegarde des préférences');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await api.version.getLatest();
      if (!res.success || !res.data || typeof res.data.versionCode !== 'number') {
        toast.error('Impossible de vérifier les mises à jour');
        return;
      }
      const latest = res.data;
      const hasUpdate = latest.versionCode > APP_VERSION_CODE;
      setUpdateInfo({ hasUpdate, latest });
      if (hasUpdate) {
        toast.success(`Nouvelle version disponible : ${latest.versionName}`);
      } else {
        toast.success('Vous disposez déjà de la dernière version');
      }
    } catch {
      toast.error('Impossible de vérifier les mises à jour');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const openUpdateDownload = async () => {
    if (!updateInfo?.latest.downloadUrl) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: updateInfo.latest.downloadUrl });
      } else {
        window.open(updateInfo.latest.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(updateInfo.latest.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    setMounted(true);
    loadViewOnceCommandConfig();
    loadKeyBackupStatus();
  }, []);

  const loadKeyBackupStatus = async () => {
    try {
      setIsLoadingBackup(true);
      const response = await api.e2e.getKeyBackup();
      if (response.success) {
        setHasBackup(response.data?.hasBackup === true);
      }
    } catch (error) {
      console.error('Error loading key backup status:', error);
      setHasBackup(false);
    } finally {
      setIsLoadingBackup(false);
    }
  };

  const handleSaveKeyBackup = async () => {
    if (!user?.id) return;
    if (!backupPassphrase.trim() || backupPassphrase.trim().length < 6) {
      toast.error('La phrase secrète doit contenir au moins 6 caractères');
      return;
    }
    setIsSavingBackup(true);
    try {
      await backupPrivateKeyWithPassphrase(user.id, backupPassphrase);
      toast.success(hasBackup ? 'Phrase secrète mise à jour !' : 'Clé sauvegardée !');
      setBackupPassphrase('');
      setHasBackup(true);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleDeleteKeyBackup = async () => {
    if (!confirm('Supprimer la sauvegarde de votre clé de déchiffrement ? Sans elle, vos captures seront définitivement perdues si vous réinstallez l’application.')) {
      return;
    }
    setIsDeletingBackup(true);
    try {
      await deletePrivateKeyBackup();
      toast.success('Sauvegarde supprimée');
      setHasBackup(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeletingBackup(false);
    }
  };

  const loadViewOnceCommandConfig = async () => {
    try {
      setIsLoadingCommandConfig(true);
      const response = await api.viewOnce.getCommandConfig();
      if (response.success && response.data) {
        setViewOnceCommand(response.data.command_text || '.vv');
        setViewOnceEmoji(response.data.command_emoji || '');
        setViewOnceEnabled(response.data.enabled !== false);
      }
    } catch (error) {
      console.error('Error loading View Once command config:', error);
    } finally {
      setIsLoadingCommandConfig(false);
    }
  };

  const handleSaveViewOnceCommand = async () => {
    try {
      setIsSavingCommandConfig(true);
      const response = await api.viewOnce.updateCommandConfig({
        command_text: viewOnceCommand.trim(),
        command_emoji: viewOnceEmoji.trim() || null,
        enabled: viewOnceEnabled,
      });
      if (response.success) {
        toast.success('Configuration de la commande View Once enregistrée !');
      } else {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Error saving View Once command config:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSavingCommandConfig(false);
    }
  };

  const handleSave = () => {
    toast.success("Paramètres enregistrés !");
  };


  const handleDisconnect = () => {
    if (confirm("Êtes-vous sûr de vouloir déconnecter WhatsApp ?")) {
      disconnect();
    }
  };

  const handlePairingCode = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }
    try {
      console.log('[Settings] Pairing Code button clicked with phone:', phoneNumber);
      await getPairingCode(phoneNumber.trim());
      // Immediately refetch status to get the pairing code
      setTimeout(async () => {
        refetchWhatsAppStatus();
      }, 1000);
    } catch (error) {
      console.error('[Settings] Error getting pairing code:', error);
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
                    Recevoir des alertes sur votre téléphone (nouveaux messages, captures, …)
                  </p>
                </div>
                <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} disabled={isLoadingNotifications} />
              </div>

              {notifEnabled && (
                <div className="space-y-3 rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Label className="text-sm">Nouveaux messages</Label>
                      <p className="text-xs text-muted-foreground">Un client vous écrit sur WhatsApp</p>
                    </div>
                    <Switch checked={notifNewMessage} onCheckedChange={setNotifNewMessage} disabled={isLoadingNotifications} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Label className="text-sm">Captures de messages éphémères</Label>
                      <p className="text-xs text-muted-foreground">Quand un message Vue Unique est capturé</p>
                    </div>
                    <Switch checked={notifViewOnce} onCheckedChange={setNotifViewOnce} disabled={isLoadingNotifications} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Label className="text-sm">Messages supprimés</Label>
                      <p className="text-xs text-muted-foreground">Quand un message est supprimé par l'expéditeur</p>
                    </div>
                    <Switch checked={notifDeletedMessage} onCheckedChange={setNotifDeletedMessage} disabled={isLoadingNotifications} />
                  </div>
                  <Button onClick={handleSaveNotifications} disabled={isLoadingNotifications || isSavingNotifications} className="mt-1">
                    {isSavingNotifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enregistrer les préférences
                  </Button>
                </div>
              )}

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
                    <div className="space-y-3">
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
                          onClick={() => {
                            if (!showPhoneInput) {
                              setShowPhoneInput(true);
                              return;
                            }
                            handlePairingCode();
                          }}
                          disabled={isGettingQR || isGettingPairingCode}
                          className="text-xs sm:text-sm"
                        >
                          {isGettingPairingCode ? 'Génération...' : 'Code de Couplage'}
                        </Button>
                      </div>
                      {showPhoneInput && (
                        <div className="space-y-2 p-3 border border-border rounded-lg bg-muted/50">
                          <Label htmlFor="phoneNumber" className="text-xs">Numéro de téléphone</Label>
                          <div className="flex gap-2">
                            <Input
                              id="phoneNumber"
                              type="tel"
                              placeholder="+229 67 00 11 22"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="text-sm"
                              disabled={isGettingPairingCode}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && phoneNumber.trim().length >= 8) {
                                  handlePairingCode();
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={handlePairingCode}
                              disabled={!phoneNumber || phoneNumber.trim().length < 8 || isGettingPairingCode}
                            >
                              {isGettingPairingCode ? 'Génération...' : 'Générer'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Format: +XX XXXX XXXX ou XXXXXXXXXX
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowPhoneInput(false);
                              setPhoneNumber('');
                            }}
                            className="text-xs"
                          >
                            Annuler
                          </Button>
                        </div>
                      )}
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
                Passer à Premium - 1500f/mois
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
                {mounted ? (
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={(checked) => {
                      setTheme(checked ? 'dark' : 'light');
                      toast.success(checked ? 'Mode sombre activé' : 'Mode clair activé');
                    }}
                  />
                ) : (
                  <Switch disabled />
                )}
              </div>

              <Button onClick={handleSave}>Enregistrer</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Commande View Once
              </CardTitle>
              <CardDescription>
                Configurez la commande pour capturer les messages View Once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCommandConfig ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="viewOnceCommand">Commande texte (par défaut: .vv)</Label>
                    <Input
                      id="viewOnceCommand"
                      value={viewOnceCommand}
                      onChange={(e) => setViewOnceCommand(e.target.value)}
                      placeholder=".vv"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisez cette commande en répondant à un message View Once pour le capturer
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="viewOnceEmoji">Commande emoji (optionnel)</Label>
                    <Input
                      id="viewOnceEmoji"
                      value={viewOnceEmoji}
                      onChange={(e) => setViewOnceEmoji(e.target.value)}
                      placeholder="👀"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez aussi utiliser un emoji comme commande (ex: 👀)
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label className="text-sm">Activer la capture View Once</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Désactiver pour arrêter la capture automatique
                      </p>
                    </div>
                    <Switch
                      checked={viewOnceEnabled}
                      onCheckedChange={setViewOnceEnabled}
                    />
                  </div>

                  <Button
                    onClick={handleSaveViewOnceCommand}
                    disabled={isSavingCommandConfig}
                    className="w-full sm:w-auto"
                  >
                    {isSavingCommandConfig ? 'Enregistrement...' : 'Enregistrer la configuration'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mise à jour de l'application</CardTitle>
              <CardDescription>
                Version installée : {APP_VERSION_NAME} (code {APP_VERSION_CODE})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="w-full sm:w-auto"
              >
                {checkingUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Vérifier les mises à jour'
                )}
              </Button>

              {updateInfo && updateInfo.hasUpdate && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Nouvelle version disponible : {updateInfo.latest.versionName}
                    </p>
                    {updateInfo.latest.notes && (
                      <pre className="whitespace-pre-line text-xs text-muted-foreground">
                        {updateInfo.latest.notes}
                      </pre>
                    )}
                  </div>
                  <Button onClick={openUpdateDownload} className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    Mettre à jour
                  </Button>
                </div>
              )}

              {updateInfo && !updateInfo.hasUpdate && (
                <p className="text-sm text-muted-foreground">
                  Vous utilisez la dernière version.
                </p>
              )}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Clé de déchiffrement E2E
              </CardTitle>
              <CardDescription>
                Sauvegardez votre clé privée avec une phrase secrète pour la retrouver
                après une réinstallation de l'application ou sur un autre téléphone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingBackup ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  {hasBackup ? (
                    <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="font-medium text-sm sm:text-base text-green-600">✓ Sauvegarde active</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Votre clé de déchiffrement est sauvegardée de façon chiffrée sur le serveur.
                        Gardez précieusement votre phrase secrète.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 bg-muted border border-border rounded-lg">
                      <p className="font-medium text-sm sm:text-base">Aucune sauvegarde</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Configurez une phrase secrète pour protéger votre clé de déchiffrement.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="backupPassphrase" className="text-sm">
                      {hasBackup ? 'Nouvelle phrase secrète' : 'Phrase secrète (min. 6 caractères)'}
                    </Label>
                    <Input
                      id="backupPassphrase"
                      type="password"
                      placeholder="••••••••"
                      value={backupPassphrase}
                      onChange={(e) => setBackupPassphrase(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ⚠️ La phrase ne peut pas être récupérée : notez-la dans un endroit sûr.
                      Sans elle, impossible de restaurer vos anciennes captures.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleSaveKeyBackup}
                      disabled={isSavingBackup}
                      className="flex-1"
                    >
                      {isSavingBackup ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : hasBackup ? (
                        'Mettre à jour la phrase'
                      ) : (
                        'Sauvegarder ma clé'
                      )}
                    </Button>
                    {hasBackup && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteKeyBackup}
                        disabled={isDeletingBackup}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
