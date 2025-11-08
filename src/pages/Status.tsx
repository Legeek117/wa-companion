import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { Heart, TrendingUp, Users, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Status = () => {
  const [autoLike, setAutoLike] = useState(true);
  const [selectedEmoji, setSelectedEmoji] = useState("❤️");

  const emojis = ["❤️", "😍", "🔥", "👍", "😊", "💯", "🎉", "✨"];

  const handleEmojiChange = (emoji: string) => {
    setSelectedEmoji(emoji);
    toast.success(`Emoji changé : ${emoji}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des Status</h1>
        <p className="text-muted-foreground">Gérez et automatisez vos interactions avec les status WhatsApp</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Likés aujourd'hui"
          value="23"
          icon={Heart}
          description="Status automatiques"
        />
        <StatsCard
          title="Cette semaine"
          value="156"
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Contacts actifs"
          value="42"
          icon={Users}
          description="Avec status récents"
        />
        <StatsCard
          title="Temps économisé"
          value="2.3h"
          icon={Clock}
          description="Cette semaine"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Auto-Like</CardTitle>
          <CardDescription>Paramétrez le like automatique des status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-like">Activer Auto-Like</Label>
              <p className="text-sm text-muted-foreground">
                Liker automatiquement tous les nouveaux status
              </p>
            </div>
            <Switch
              id="auto-like"
              checked={autoLike}
              onCheckedChange={(checked) => {
                setAutoLike(checked);
                toast.success(checked ? "Auto-like activé" : "Auto-like désactivé");
              }}
            />
          </div>

          <div className="space-y-3">
            <Label>Emoji par défaut</Label>
            <div className="grid grid-cols-8 gap-2">
              {emojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant={selectedEmoji === emoji ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleEmojiChange(emoji)}
                  className="text-2xl h-14"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Status;
