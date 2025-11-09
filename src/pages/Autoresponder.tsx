import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { StatsCard } from "@/components/StatsCard";
import { MessageSquare, Send, Users, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Autoresponder = () => {
  const [isPremium] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const [busyMode, setBusyMode] = useState(false);

  const defaultOfflineMessage = `🤖 Répondeur automatique

Bonjour ! Je ne suis pas disponible pour le moment.
Laissez-moi un message, je vous répondrai dès que possible.

Merci de votre compréhension !`;

  const defaultBusyMessage = `⏰ Mode Occupé

Je suis actuellement occupé(e) et ne peux pas répondre.
Je reviendrai vers vous dès que possible.

Merci de patienter !`;

  const contacts = [
    { id: 1, name: "Sarah", enabled: true },
    { id: 2, name: "John", enabled: false },
    { id: 3, name: "Marie", enabled: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Répondeur Automatique</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez vos réponses automatiques intelligentes</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={isPremium} />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <StatsCard
          title="Messages reçus"
          value="47"
          icon={MessageSquare}
          description="Aujourd'hui"
        />
        <StatsCard
          title="Réponses envoyées"
          value="47"
          icon={Send}
          description="Automatiques"
        />
        <StatsCard
          title="Contacts uniques"
          value="23"
          icon={Users}
          description="Cette semaine"
        />
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
                value={defaultOfflineMessage}
                disabled={!isPremium}
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
                onCheckedChange={(checked) => {
                  setBusyMode(checked);
                  toast.success(checked ? "Mode Occupé activé" : "Mode Occupé désactivé");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Message {!isPremium && <span className="text-xs text-muted-foreground">🔒 Non modifiable</span>}</Label>
              <Textarea
                value={defaultBusyMessage}
                disabled={!isPremium}
                rows={6}
                className={`text-sm sm:min-h-[140px] ${!isPremium ? "bg-muted cursor-not-allowed" : ""}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {!isPremium && (
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
                <Button className="bg-premium mt-4">
                  Passer à Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isPremium && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Filtrage des Destinataires</CardTitle>
            <CardDescription>Choisissez qui reçoit les réponses automatiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Activer Tout</Button>
              <Button variant="outline" size="sm">Désactiver Tout</Button>
            </div>

            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.enabled ? "Réponse auto" : "Pas de réponse"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={contact.enabled} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Autoresponder;
