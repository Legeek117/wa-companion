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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages Supprimés</h1>
          <p className="text-muted-foreground">Récupérez les messages effacés automatiquement</p>
        </div>
        <PlanBadge isPremium={isPremium} />
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
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={msg.avatar} />
                        <AvatarFallback>{msg.sender[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{msg.sender}</p>
                            <p className="text-xs text-muted-foreground">{msg.date}</p>
                          </div>
                          <Badge variant="destructive" className="gap-1">
                            <Trash2 className="w-3 h-3" />
                            Supprimé
                          </Badge>
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
