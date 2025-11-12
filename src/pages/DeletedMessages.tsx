import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/PlanBadge";
import { QuotaCounter } from "@/components/QuotaCounter";
import { Pagination } from "@/components/ui/pagination";
import { MediaViewer } from "@/components/ui/media-viewer";
import { Trash2, MessageSquare, Crown, Image as ImageIcon, FileText, Eye, Download, Clock, User, XCircle, Play, FileDown, Calendar } from "lucide-react";
import { useDeletedMessages } from "@/hooks/useDeletedMessages";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { useState } from "react";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to build full media URL
const buildMediaUrl = (mediaUrl: string | null): string | null => {
  if (!mediaUrl) return null;
  // If already a full URL, return as is
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  // If relative URL, prepend API_URL
  return `${API_URL}${mediaUrl}`;
};

const DeletedMessages = () => {
  const { messages, isLoading, quota, isPremium } = useDeletedMessages();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      return;
    }

    setDeletingId(messageId);
    try {
      const response = await api.deletedMessages.delete(messageId);
      if (response.success) {
        toast.success('Message supprimé avec succès');
        // Invalidate and refetch deleted messages
        queryClient.invalidateQueries({ queryKey: ['deleted-messages'] });
      } else {
        toast.error(response.error?.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };
  
  const savedCount = quota?.used || 0;
  const maxSaved = quota?.limit || 3;
  
  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(messages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = messages.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6 ios-fade-in">
      {/* Header avec glassmorphism */}
      <div className="glass-card rounded-[2rem] p-4 sm:p-6 ios-transition">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Messages Supprimés
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Récupérez les messages effacés automatiquement</p>
          </div>
          <div className="flex-shrink-0 ios-scale">
            <PlanBadge plan={isPremium ? 'premium' : 'free'} />
          </div>
        </div>
      </div>

      {!isPremium && (
        <div className="glass-card rounded-[2rem] p-4 sm:p-6 border-premium/30 bg-gradient-to-br from-premium/10 to-premium/5 ios-transition ios-hover">
          <QuotaCounter
            current={savedCount}
            max={maxSaved}
            label="Messages sauvegardés ce mois"
          />
          <div className="mt-4 p-4 sm:p-5 glass rounded-2xl ios-transition">
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4 text-premium" />
              Passez à Premium !
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Messages illimités + recherche avancée + statistiques + export
            </p>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-premium to-premium/80 hover:from-premium/90 hover:to-premium/70 text-white shadow-premium ios-scale ios-transition-fast" 
              onClick={() => navigate('/dashboard/upgrade')}
            >
              <Crown className="w-4 h-4 mr-2" />
              Débloquer Premium
            </Button>
          </div>
        </div>
      )}

      {/* Messages Card avec glassmorphism */}
      <div className="glass-card rounded-[2rem] overflow-hidden ios-transition">
        <div className="p-4 sm:p-6 border-b border-border/30">
          <h2 className="text-xl font-bold mb-1">Messages Récupérés</h2>
          <p className="text-sm text-muted-foreground">
            {isPremium ? "Tous vos messages supprimés" : `${savedCount} messages disponibles`}
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <Loading text="Chargement des messages..." showLogo={true} />
          ) : messages.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="glass rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center ios-bounce">
                <Trash2 className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold mb-2">Aucun message supprimé</p>
              <p className="text-sm text-muted-foreground">Les messages supprimés seront automatiquement sauvegardés ici</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:space-y-4">
                {paginatedMessages.map((msg, index) => {
                const sentDate = new Date(msg.sent_at);
                const deletedDate = new Date(msg.deleted_at);
                const delayMinutes = Math.round(msg.delay_seconds / 60);
                
                return (
                  <div 
                    key={msg.id} 
                    className="glass-card rounded-2xl p-5 sm:p-6 border-destructive/20 hover:border-destructive/40 ios-transition ios-hover ios-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Header avec avatar et bouton supprimé */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-destructive/30 ios-scale">
                            <AvatarFallback className="text-base font-bold bg-gradient-to-br from-destructive/30 to-destructive/20 text-destructive-foreground">
                              {msg.sender_name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive rounded-full border-2 border-background flex items-center justify-center shadow-md">
                            <XCircle className="w-3 h-3 text-destructive-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-bold text-base sm:text-lg truncate">{msg.sender_name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{sentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2 text-xs h-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-destructive via-destructive/95 to-destructive/90 hover:from-destructive/95 hover:via-destructive/90 hover:to-destructive/85 shadow-lg hover:shadow-xl ios-scale ios-transition-fast flex-shrink-0"
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                      >
                        {deletingId === msg.id ? (
                          <>
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Suppression...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Contenu du message */}
                    {msg.content && (
                      <div className="glass rounded-xl p-4 sm:p-5 border border-border/30 mb-4 ios-transition">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-sm sm:text-base break-words leading-relaxed flex-1">{msg.content}</p>
                        </div>
                      </div>
                    )}

                    {/* Média */}
                    {msg.media_type && msg.media_url && (() => {
                      const fullMediaUrl = buildMediaUrl(msg.media_url);
                      if (!fullMediaUrl) return null;
                      
                      // Determine media type for viewer
                      const viewerType: 'image' | 'video' = 
                        ['image', 'sticker'].includes(msg.media_type) ? 'image' : 
                        msg.media_type === 'video' ? 'video' : 'image';
                      
                      return (
                        <div className="glass rounded-xl p-4 sm:p-5 border border-border/30 mb-4 ios-transition">
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant="outline" className="text-xs px-3 py-2 rounded-lg border-border/50 gap-2">
                              {msg.media_type === 'image' && <ImageIcon className="w-4 h-4" />}
                              {msg.media_type === 'video' && <Play className="w-4 h-4" />}
                              {msg.media_type === 'audio' && <FileText className="w-4 h-4" />}
                              {msg.media_type === 'document' && <FileDown className="w-4 h-4" />}
                              <span className="capitalize">{msg.media_type}</span>
                            </Badge>
                            {(viewerType === 'image' || viewerType === 'video') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-auto py-2 px-4 rounded-lg gap-2 ios-scale ios-transition-fast"
                                onClick={() => setSelectedMedia({
                                  url: fullMediaUrl,
                                  type: viewerType,
                                  title: `${msg.sender_name} - ${new Date(msg.sent_at).toLocaleString('fr-FR')}`,
                                })}
                              >
                                <Eye className="w-4 h-4" />
                                <span>Voir</span>
                              </Button>
                            )}
                            {(msg.media_type === 'audio' || msg.media_type === 'document') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-auto py-2 px-4 rounded-lg gap-2 ios-scale ios-transition-fast"
                                onClick={() => window.open(fullMediaUrl, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                                <span>Télécharger</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Footer avec métadonnées */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-3 border-t border-border/30">
                      <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg border border-border/30 text-xs">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Envoyé :</span>
                        <span className="font-medium">{sentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg border border-border/30 text-xs">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-muted-foreground">Supprimé :</span>
                        <span className="font-medium">{deletedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <Badge variant="outline" className="text-xs px-3 py-2 rounded-lg border-destructive/40 text-destructive bg-destructive/5 gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Délai : {delayMinutes} min</span>
                      </Badge>
                    </div>
                  </div>
                );
              })}
              </div>
              
              {totalPages > 1 && (
                <div className="mt-6 sm:mt-8 flex justify-center">
                  <div className="glass-card rounded-2xl p-2 ios-transition">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      showFirstLast={false}
                      maxVisible={5}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Media Viewer */}
      {selectedMedia && (
        <MediaViewer
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.type}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          title={selectedMedia.title}
        />
      )}
    </div>
  );
};

export default DeletedMessages;
