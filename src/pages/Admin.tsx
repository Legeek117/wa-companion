import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, Shield, MessageSquare, Clock, LogOut } from "lucide-react";
import { Loading } from "@/components/Loading";

const Admin = () => {
  const { useUsers, useToggleLogging, logout, adminToken } = useAdmin();
  const { data: users, isLoading } = useUsers();
  const navigate = useNavigate();

  if (!adminToken) return <Navigate to="/admin/auth" replace />;
  if (isLoading) return <Loading />;

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
                const toggleLogging = useToggleLogging(user.id);
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
                          onCheckedChange={(checked) => toggleLogging.mutate(checked)}
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
                        onClick={() => navigate(`/admin/user/${user.id}`)}
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
