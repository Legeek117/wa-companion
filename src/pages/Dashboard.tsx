import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heart, Eye, Trash2, Bot, Calendar, Sparkles, TrendingUp, Activity } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useNavigate } from "react-router-dom";
import { PlanBadge } from "@/components/PlanBadge";
import { Loading } from "@/components/Loading";

const Dashboard = () => {
  const { user, isPremium, stats, recentActivity, isLoading, quota } = useDashboard();
  const { status: whatsappStatus, isConnected, getQR } = useWhatsApp();
  const navigate = useNavigate();

  // Format stats for display
  const displayStats = [
    {
      title: "Status Likés",
      value: stats.statusLiked.toString(),
      subtitle: "aujourd'hui",
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/20"
    },
    {
      title: "View Once",
      value: stats.viewOnceLimit === Infinity 
        ? `${stats.viewOnceCount}` 
        : `${stats.viewOnceCount}/${stats.viewOnceLimit}`,
      subtitle: "ce mois",
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      progress: stats.viewOnceLimit === Infinity 
        ? 0 
        : (stats.viewOnceCount / stats.viewOnceLimit) * 100
    },
    {
      title: "Messages Récupérés",
      value: stats.deletedMessagesLimit === Infinity 
        ? `${stats.deletedMessagesCount}` 
        : `${stats.deletedMessagesCount}/${stats.deletedMessagesLimit}`,
      subtitle: "ce mois",
      icon: Trash2,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      progress: stats.deletedMessagesLimit === Infinity 
        ? 0 
        : (stats.deletedMessagesCount / stats.deletedMessagesLimit) * 100
    },
    {
      title: "Réponses Auto",
      value: stats.autoReplies.toString(),
      subtitle: "cette semaine",
      icon: Bot,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20"
    }
  ];

  // Format activity icons
  const activityIcons = {
    status: Heart,
    view_once: Eye,
    deleted_message: Trash2,
    autoresponder: Bot,
  };

  const activityColors = {
    status: "text-pink-500",
    view_once: "text-blue-500",
    deleted_message: "text-orange-500",
    autoresponder: "text-emerald-500",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Tableau de bord</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Bienvenue de retour ! Voici un aperçu de votre activité.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {isLoading ? (
            <div className="h-6 w-20 flex items-center justify-center">
              <Loading size="sm" showLogo={false} text="" />
            </div>
          ) : (
            <PlanBadge plan={user?.plan || 'free'} />
          )}
          {!isPremium && (
            <Button 
              className="bg-gradient-premium text-xs sm:text-sm px-3 sm:px-4"
              onClick={() => navigate('/dashboard/upgrade')}
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Passer à Premium</span>
              <span className="sm:hidden">Premium</span>
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Card className="border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                isConnected 
                  ? 'bg-green-500 animate-pulse' 
                  : whatsappStatus?.status === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base">
                  {isConnected 
                    ? 'WhatsApp Connecté' 
                    : whatsappStatus?.status === 'connecting'
                    ? 'Connexion en cours...'
                    : 'WhatsApp Non Connecté'}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {whatsappStatus?.lastSeen 
                    ? `Dernière synchronisation : ${new Date(whatsappStatus.lastSeen).toLocaleString('fr-FR')}`
                    : 'Connectez votre WhatsApp pour commencer'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={() => {
                if (!isConnected) {
                  getQR();
                }
                navigate('/dashboard/settings');
              }}
            >
              {isConnected ? 'Paramètres' : 'Voir QR Code'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          <div className="col-span-full">
            <Loading text="Chargement des statistiques..." showLogo={true} />
          </div>
        ) : (
          displayStats.map((stat, index) => (
          <Card key={index} className="border-border hover:shadow-md transition-shadow">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                {stat.progress !== undefined && (
                  <Progress value={stat.progress} className="mt-2 sm:mt-3 h-1" />
                )}
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <Card className="border-border">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              Activité récente
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Vos dernières interactions automatisées</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loading text="Chargement de l'activité..." showLogo={true} size="sm" />
            ) : recentActivity.length > 0 ? (
              <div className="space-y-2 sm:space-y-4">
                {recentActivity.map((activity) => {
                  const Icon = activityIcons[activity.type];
                  const color = activityColors[activity.type];
                  return (
                    <div key={activity.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className={`p-1.5 sm:p-2 rounded-full bg-background flex-shrink-0`}>
                        <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.contact}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{activity.time}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Aucune activité récente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Actions rapides
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Gérez vos fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start text-xs sm:text-sm h-auto py-2 sm:py-3"
              onClick={() => navigate('/dashboard/status/config')}
            >
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-xs sm:text-sm">Configurer Auto-Like</div>
                <div className="text-xs text-muted-foreground hidden sm:block">Choisir emoji et contacts</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-xs sm:text-sm h-auto py-2 sm:py-3"
              onClick={() => navigate('/dashboard/status/schedule')}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-xs sm:text-sm">Programmer un Status</div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {quota?.scheduledStatuses?.used || 0}/{quota?.scheduledStatuses?.limit === Infinity ? '∞' : quota?.scheduledStatuses?.limit || 5} utilisé ce mois
                </div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-xs sm:text-sm h-auto py-2 sm:py-3"
              onClick={() => navigate('/dashboard/autoresponder')}
            >
              <Bot className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-xs sm:text-sm">Activer Répondeur</div>
                <div className="text-xs text-muted-foreground hidden sm:block">Mode Hors Ligne / Occupé</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start text-xs sm:text-sm h-auto py-2 sm:py-3"
              onClick={() => navigate('/dashboard/view-once')}
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="text-left flex-1">
                <div className="font-medium text-xs sm:text-sm">Voir View Once</div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {stats.viewOnceCount} capture{stats.viewOnceCount > 1 ? 's' : ''} disponible{stats.viewOnceCount > 1 ? 's' : ''}
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Premium Upsell */}
      <Card className="border-premium shadow-premium bg-gradient-to-r from-premium/5 to-premium/10">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-premium flex-shrink-0" />
                <span className="text-sm sm:text-base md:text-lg">Débloquez toute la puissance avec Premium</span>
              </h3>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>✓ View Once et Messages supprimés illimités</li>
                <li>✓ Filtrage intelligent du répondeur automatique</li>
                <li>✓ Analytics détaillés et statistiques avancées</li>
                <li>✓ Support prioritaire et backup automatique</li>
              </ul>
            </div>
            <Button className="bg-gradient-premium whitespace-nowrap text-xs sm:text-sm w-full sm:w-auto">
              <span className="hidden sm:inline">Essayer 30 jours</span>
              <span className="sm:hidden">Essayer</span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;