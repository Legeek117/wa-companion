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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuration Avancée</h1>
            <p className="text-muted-foreground">Personnalisez le like par contact</p>
          </div>
          <PlanBadge isPremium={false} />
        </div>

        <Card className="border-premium">
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-8">
              <Crown className="w-16 h-16 mx-auto text-premium" />
              <h3 className="text-2xl font-bold">Fonctionnalité Premium</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                La configuration avancée des likes par contact est réservée aux membres Premium.
                Personnalisez vos réactions pour chaque contact individuellement.
              </p>
              <div className="pt-4">
                <Button className="bg-premium hover:bg-premium/90">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration Avancée</h1>
          <p className="text-muted-foreground">Personnalisez le like par contact</p>
        </div>
        <PlanBadge isPremium={true} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Contacts</CardTitle>
          <CardDescription>
            Activez/Désactivez l'auto-like et personnalisez l'emoji par contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un contact..." className="pl-10" />
            </div>
            <Button variant="outline">Tout activer</Button>
            <Button variant="outline">Tout désactiver</Button>
          </div>

          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar>
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback>{contact.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="text-2xl px-3">
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
