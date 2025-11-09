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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">View Once Capturés</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Messages éphémères sauvegardés automatiquement</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={isPremium} />
        </div>
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {captures.map((capture) => (
                <Card key={capture.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      <Image className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        {capture.type}
                      </Badge>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarImage src={capture.avatar} />
                          <AvatarFallback className="text-xs">{capture.sender[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{capture.sender}</p>
                          <p className="text-xs text-muted-foreground">{capture.timestamp}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Voir
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Télécharger</span>
                          <span className="sm:hidden">DL</span>
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
