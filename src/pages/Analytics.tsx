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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Statistiques détaillées de votre bot</p>
          </div>
          <PlanBadge isPremium={false} />
        </div>

        <Card className="border-premium">
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-12">
              <Crown className="w-20 h-20 mx-auto text-premium" />
              <h3 className="text-3xl font-bold">Fonctionnalité Premium</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Accédez à des analytics détaillés avec graphiques interactifs, tendances,
                rapports téléchargeables et insights avancés sur l'utilisation de votre bot.
              </p>
              <div className="pt-6">
                <Button size="lg" className="bg-premium hover:bg-premium/90">
                  <Crown className="w-5 h-5 mr-2" />
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
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Statistiques détaillées de votre bot</p>
        </div>
        <PlanBadge isPremium={true} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activité Globale</CardTitle>
            <CardDescription>Vue d'ensemble de l'utilisation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Graphique d'activité
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendances des Status</CardTitle>
            <CardDescription>Évolution des likes automatiques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Graphique de tendances
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports Détaillés</CardTitle>
          <CardDescription>Exportez vos données d'utilisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            📊 Rapport Mensuel (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start">
            📈 Rapport Annuel (PDF)
          </Button>
          <Button variant="outline" className="w-full justify-start">
            📁 Export Données (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
