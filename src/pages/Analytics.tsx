import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { PlanBadge } from "@/components/PlanBadge";
import { Heart, Eye, Trash2, MessageSquare, TrendingUp, Crown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { useMemo } from "react";

const Analytics = () => {
  const { overview, statusAnalytics, viewOnceAnalytics, deletedMessagesAnalytics, isLoading, isPremium } = useAnalytics();
  const navigate = useNavigate();

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR');
  };

  // Calculate trend value for StatsCard
  const getTrendValue = (trend: number) => {
    return Math.abs(trend);
  };

  if (!isPremium) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Statistiques détaillées de votre bot</p>
          </div>
          <div className="flex-shrink-0">
            <PlanBadge plan="free" />
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
                <Button 
                  size="lg" 
                  className="bg-premium hover:bg-premium/90 text-sm sm:text-base w-full sm:w-auto"
                  onClick={() => navigate('/dashboard/upgrade')}
                >
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
          <PlanBadge plan="premium" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Loading key={index} text="Chargement..." showLogo={true} size="sm" />
          ))}
        </div>
      ) : (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Status Likés"
            value={formatNumber(overview?.overview.statusLikes.total || 0)}
          icon={Heart}
            trend={{
              value: getTrendValue(overview?.overview.statusLikes.trend || 0),
              isPositive: (overview?.overview.statusLikes.trend || 0) >= 0,
            }}
        />
        <StatsCard
          title="View Once"
            value={formatNumber(overview?.overview.viewOnce.total || 0)}
          icon={Eye}
            trend={{
              value: getTrendValue(overview?.overview.viewOnce.trend || 0),
              isPositive: (overview?.overview.viewOnce.trend || 0) >= 0,
            }}
        />
        <StatsCard
          title="Messages Supprimés"
            value={formatNumber(overview?.overview.deletedMessages.total || 0)}
          icon={Trash2}
            trend={{
              value: getTrendValue(overview?.overview.deletedMessages.trend || 0),
              isPositive: (overview?.overview.deletedMessages.trend || 0) >= 0,
            }}
        />
        <StatsCard
          title="Réponses Auto"
            value={overview?.overview.autoresponder.active ? "Actif" : "Inactif"}
          icon={MessageSquare}
            trend={undefined}
        />
      </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Activité Globale</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Vue d'ensemble de l'utilisation (30 derniers jours)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loading text="Chargement du graphique..." showLogo={true} size="sm" />
            ) : (
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
                {statusAnalytics?.dailyData && statusAnalytics.dailyData.length > 0 ? (
                  <div className="space-y-2 w-full">
                    <p className="text-center font-semibold mb-4">Total: {formatNumber(statusAnalytics.total)} status likés</p>
                    <div className="space-y-1">
                      {statusAnalytics.dailyData.slice(-7).map((day, index) => {
                        const maxCount = Math.max(...statusAnalytics.dailyData.map(d => d.count));
                        const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs w-20">{new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                            <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs w-12 text-right">{day.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p>Aucune donnée disponible</p>
                )}
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Tendances des Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Évolution des likes automatiques</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loading text="Chargement du graphique..." showLogo={true} size="sm" />
            ) : (
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-sm sm:text-base">
                {statusAnalytics?.topContacts && statusAnalytics.topContacts.length > 0 ? (
                  <div className="space-y-2 w-full">
                    <p className="text-center font-semibold mb-4">Top Contacts</p>
                    <div className="space-y-2">
                      {statusAnalytics.topContacts.slice(0, 5).map((contact, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm truncate flex-1">{contact.contact_name}</span>
                          <span className="text-sm font-semibold ml-2">{contact.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p>Aucune donnée disponible</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">View Once Analytics</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Statistiques des messages éphémères</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loading text="Chargement du graphique..." showLogo={true} size="sm" />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Total: {formatNumber(viewOnceAnalytics?.total || 0)} captures</p>
                  {viewOnceAnalytics?.mediaTypeCounts && Object.keys(viewOnceAnalytics.mediaTypeCounts).length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(viewOnceAnalytics.mediaTypeCounts).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm capitalize">{type}</span>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {viewOnceAnalytics?.topSenders && viewOnceAnalytics.topSenders.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Top Expéditeurs</p>
                    <div className="space-y-1">
                      {viewOnceAnalytics.topSenders.slice(0, 5).map((sender, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm truncate flex-1">{sender.sender_name}</span>
                          <span className="text-sm font-semibold ml-2">{sender.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Messages Supprimés Analytics</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Statistiques des messages supprimés</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loading text="Chargement du graphique..." showLogo={true} size="sm" />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Total: {formatNumber(deletedMessagesAnalytics?.total || 0)} messages</p>
                  {deletedMessagesAnalytics?.messageTypeCounts && Object.keys(deletedMessagesAnalytics.messageTypeCounts).length > 0 && (
                    <div className="space-y-1">
                      {Object.entries(deletedMessagesAnalytics.messageTypeCounts).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm capitalize">{type}</span>
                          <span className="text-sm font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {deletedMessagesAnalytics?.topSenders && deletedMessagesAnalytics.topSenders.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Top Expéditeurs</p>
                    <div className="space-y-1">
                      {deletedMessagesAnalytics.topSenders.slice(0, 5).map((sender, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                          <span className="text-sm truncate flex-1">{sender.sender_name}</span>
                          <span className="text-sm font-semibold ml-2">{sender.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Rapports Détaillés</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Exportez vos données d'utilisation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            📊 Rapport Mensuel (PDF) - Bientôt disponible
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            📈 Rapport Annuel (PDF) - Bientôt disponible
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs sm:text-sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            📁 Export Données (JSON) - Bientôt disponible
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
