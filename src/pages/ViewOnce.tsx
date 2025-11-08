import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/PlanBadge";
import { QuotaCounter } from "@/components/QuotaCounter";
import { Download, Eye, Image, Crown } from "lucide-react";
import { useState } from "react";

const ViewOnce = () => {
  const [isPremium] = useState(false);
  const [capturedCount] = useState(2);
  const maxCaptures = isPremium ? 999 : 3;

  const captures = [
    {
      id: 1,
      sender: "Sarah Martin",
      avatar: "/placeholder.svg",
      type: "image",
      timestamp: "Il y a 3h",
      date: "15 Jan 2025",
    },
    {
      id: 2,
      sender: "John Doe",
      avatar: "/placeholder.svg",
      type: "video",
      timestamp: "Hier",
      date: "14 Jan 2025",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">View Once Capturés</h1>
          <p className="text-muted-foreground">Messages éphémères sauvegardés automatiquement</p>
        </div>
        <PlanBadge isPremium={isPremium} />
      </div>

      {!isPremium && (
        <Card className="border-premium bg-premium/5">
          <CardContent className="pt-6">
            <QuotaCounter
              current={capturedCount}
              max={maxCaptures}
              label="Captures utilisées ce mois"
            />
            <div className="mt-4 p-4 bg-background rounded-lg">
              <p className="text-sm font-medium mb-2">Passez à Premium !</p>
              <p className="text-sm text-muted-foreground mb-3">
                Captures illimitées + galerie complète + statistiques avancées
              </p>
              <Button size="sm" className="bg-premium">
                <Crown className="w-4 h-4 mr-2" />
                Débloquer Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Galerie des Captures</CardTitle>
          <CardDescription>
            {isPremium ? "Toutes vos captures" : `${capturedCount} captures disponibles`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {captures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucune capture</p>
              <p className="text-sm">Les view once reçus seront automatiquement sauvegardés ici</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {captures.map((capture) => (
                <Card key={capture.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      <Image className="w-12 h-12 text-muted-foreground" />
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2"
                      >
                        {capture.type}
                      </Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={capture.avatar} />
                          <AvatarFallback>{capture.sender[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{capture.sender}</p>
                          <p className="text-xs text-muted-foreground">{capture.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewOnce;
