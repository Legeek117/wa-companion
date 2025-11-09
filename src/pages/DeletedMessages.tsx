import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/PlanBadge";
import { QuotaCounter } from "@/components/QuotaCounter";
import { Trash2, MessageSquare, Crown } from "lucide-react";
import { useState } from "react";

const DeletedMessages = () => {
  const [isPremium] = useState(false);
  const [savedCount] = useState(1);
  const maxSaved = isPremium ? 999 : 3;

  const messages = [
    {
      id: 1,
      sender: "Marie Dupont",
      avatar: "/placeholder.svg",
      content: "Ce message a été supprimé par l'expéditeur...",
      sentAt: "10:23",
      deletedAt: "10:25",
      delay: "2 min",
      date: "Aujourd'hui",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Messages Supprimés</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Récupérez les messages effacés automatiquement</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={isPremium} />
        </div>
      </div>

      {!isPremium && (
        <Card className="border-premium bg-premium/5">
          <CardContent className="pt-6">
            <QuotaCounter
              current={savedCount}
              max={maxSaved}
              label="Messages sauvegardés ce mois"
            />
            <div className="mt-4 p-4 bg-background rounded-lg">
              <p className="text-sm font-medium mb-2">Passez à Premium !</p>
              <p className="text-sm text-muted-foreground mb-3">
                Messages illimités + recherche avancée + statistiques + export
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
          <CardTitle>Messages Récupérés</CardTitle>
          <CardDescription>
            {isPremium ? "Tous vos messages supprimés" : `${savedCount} messages disponibles`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucun message supprimé</p>
              <p className="text-sm">Les messages supprimés seront automatiquement sauvegardés ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className="border-destructive/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback className="text-xs">{msg.sender[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{msg.sender}</p>
                            <p className="text-xs text-muted-foreground">{msg.date}</p>
                          </div>
                          <Badge variant="destructive" className="gap-1 text-xs w-fit">
                            <Trash2 className="w-3 h-3" />
                            Supprimé
                          </Badge>
                        </div>
                        <div className="bg-muted p-2 sm:p-3 rounded-lg">
                          <p className="text-xs sm:text-sm break-words">{msg.content}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                          <span>📤 Envoyé : {msg.sentAt}</span>
                          <span>🗑️ Supprimé : {msg.deletedAt}</span>
                          <Badge variant="outline" className="text-xs">
                            Délai : {msg.delay}
                          </Badge>
                        </div>
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

export default DeletedMessages;
