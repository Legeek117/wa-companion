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

const Settings = () => {
  const handleSave = () => {
    toast.success("Paramètres enregistrés !");
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
                  <AvatarFallback className="text-sm sm:text-base">JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">Changer la photo</Button>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname" className="text-sm">Prénom</Label>
                  <Input id="firstname" defaultValue="Jean" className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname" className="text-sm">Nom</Label>
                  <Input id="lastname" defaultValue="Dupont" className="text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" defaultValue="jean@example.com" className="text-sm" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Téléphone</Label>
                <Input id="phone" type="tel" defaultValue="+226 XX XX XX XX" className="text-sm" />
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base text-green-600">✓ Connecté</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Dernière activité : Il y a 5 min</p>
                </div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Scanner le QR Code</p>
                <div className="aspect-square max-w-xs mx-auto bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">QR Code ici</p>
                </div>
              </div>

              <Button variant="destructive" className="w-full">
                Déconnecter WhatsApp
              </Button>
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
                  <p className="text-sm text-muted-foreground">Gratuit</p>
                </div>
                <PlanBadge isPremium={false} />
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
