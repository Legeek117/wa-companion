import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { PlanBadge } from "@/components/PlanBadge";
import { Heart, Eye, Trash2, MessageSquare, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Analytics = () => {
  const [isPremium] = useState(false);

  if (!isPremium) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Statistiques détaillées de votre bot</p>
          </div>
          <div className="flex-shrink-0">
            <PlanBadge isPremium={false} />
          </div>
        </div>

        <Card className="border-premium">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center space-y-3 sm:space-y-4 py-8 sm:py-12 px-4">
              <Crown className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-premium" />
              <h3 className="text-2xl sm:text-3xl font-bold">Fonctionnalité Premium</h3>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Accédez à des analytics détaillés avec graphiques interactifs, tendances,
                rapports téléchargeables et insights avancés sur l'utilisation de votre bot.
              </p>
              <div className="pt-4 sm:pt-6">
                <Button size="lg" className="bg-premium hover:bg-premium/90 text-sm sm:text-base w-full sm:w-auto">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Statistiques détaillées de votre bot</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge isPremium={true} />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Status Likés"
          value="1,247"
          icon={Heart}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="View Once"
          value="89"
          icon={Eye}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Messages Supprimés"
          value="156"
          icon={Trash2}
          trend={{ value: -3, isPositive: false }}
        />
        <StatsCard
          title="Réponses Auto"
          value="2,341"
          icon={MessageSquare}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Activité Globale</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Vue d'ensemble de l'utilisation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
              Graphique d'activité
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Tendances des Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Évolution des likes automatiques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
              Graphique de tendances
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Rapports Détaillés</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Exportez vos données d'utilisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            📊 Rapport Mensuel (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            📈 Rapport Annuel (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
            📁 Export Données (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
