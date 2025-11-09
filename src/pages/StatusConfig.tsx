import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/PlanBadge";
import { Search, Crown } from "lucide-react";
import { useState } from "react";

const StatusConfig = () => {
  const [isPremium] = useState(false);

  const contacts = [
    { id: 1, name: "Sarah Martin", phone: "+226 XX XX XX XX", avatar: "/placeholder.svg", autoLike: true, emoji: "❤️" },
    { id: 2, name: "John Doe", phone: "+226 XX XX XX XX", avatar: "/placeholder.svg", autoLike: false, emoji: "🔥" },
    { id: 3, name: "Marie Dupont", phone: "+226 XX XX XX XX", avatar: "/placeholder.svg", autoLike: true, emoji: "😍" },
  ];

  if (!isPremium) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Configuration Avancée</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Personnalisez le like par contact</p>
          </div>
          <div className="flex-shrink-0">
            <PlanBadge isPremium={false} />
          </div>
        </div>

        <Card className="border-premium">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center space-y-3 sm:space-y-4 py-6 sm:py-8 px-4">
              <Crown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-premium" />
              <h3 className="text-xl sm:text-2xl font-bold">Fonctionnalité Premium</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                La configuration avancée des likes par contact est réservée aux membres Premium.
                Personnalisez vos réactions pour chaque contact individuellement.
              </p>
              <div className="pt-3 sm:pt-4">
                <Button className="bg-premium hover:bg-premium/90 text-xs sm:text-sm w-full sm:w-auto">
                  Passer à Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Configuration Avancée</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Personnalisez le like par contact</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={true} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Contacts</CardTitle>
          <CardDescription>
            Activez/Désactivez l'auto-like et personnalisez l'emoji par contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Rechercher un contact..." className="pl-10 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">Tout activer</Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm flex-1 sm:flex-none">Tout désactiver</Button>
            </div>
          </div>

          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback className="text-xs sm:text-sm">{contact.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{contact.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start">
                  <Button variant="outline" size="sm" className="text-xl sm:text-2xl px-2 sm:px-3 h-8 sm:h-9">
                    {contact.emoji}
                  </Button>
                  <Switch checked={contact.autoLike} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusConfig;
