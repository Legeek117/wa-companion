import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatusSchedule = () => {
  const navigate = useNavigate();

  // Feature is DISABLED - Show message instead
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            Fonctionnalité en Cours de Développement
          </CardTitle>
          <CardDescription className="text-yellow-600 dark:text-yellow-300">
            La programmation de statuts WhatsApp sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Cette fonctionnalité est actuellement en cours de développement. 
            Nous travaillons activement pour vous offrir la possibilité de programmer vos statuts WhatsApp.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Elle sera disponible très prochainement. Merci de votre patience !
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
          >
            Retour au Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusSchedule;

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlanBadge } from "@/components/PlanBadge";
import { Calendar, Clock, Upload, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const StatusSchedule = () => {
  const [isPremium] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const maxScheduled = isPremium ? 999 : 1;

  const handleSchedule = () => {
    if (scheduledCount >= maxScheduled) {
      toast.error("Quota atteint ! Passez à Premium pour programmer plus de status.");
      return;
    }
    setScheduledCount(scheduledCount + 1);
    toast.success("Status programmé avec succès !");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Programmer un Status</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Planifiez vos publications à l'avance</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={isPremium} />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Créer un Status</CardTitle>
            <CardDescription>
              {isPremium 
                ? "Programmation illimitée" 
                : `${scheduledCount}/${maxScheduled} status programmé cette semaine`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="media">Média (Image/Vidéo)</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour uploader ou glissez un fichier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 10MB - Images et Vidéos
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Légende</Label>
              <Textarea
                id="caption"
                placeholder="Écrivez votre légende..."
                maxLength={700}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">0/700</p>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm">Heure</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="time"
                    type="time"
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSchedule}>
              Programmer le Status
            </Button>

            {!isPremium && scheduledCount >= maxScheduled && (
              <div className="p-4 bg-premium/10 border border-premium rounded-lg">
                <p className="text-sm font-medium mb-2">Quota atteint !</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Passez à Premium pour programmer des status illimités
                </p>
                <Button variant="default" size="sm" className="bg-premium">
                  Passer à Premium
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Programmés</CardTitle>
            <CardDescription>Gérez vos publications planifiées</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun status programmé</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">Mon status</p>
                    <p className="text-sm text-muted-foreground">Lundi 15 Jan, 10:00</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatusSchedule;
