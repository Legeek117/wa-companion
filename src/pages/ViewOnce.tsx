import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlanBadge } from "@/components/PlanBadge";
import { QuotaCounter } from "@/components/QuotaCounter";
import { Pagination } from "@/components/ui/pagination";
import { MediaViewer } from "@/components/ui/media-viewer";
import { Download, Eye, Image, Crown } from "lucide-react";
import { useViewOnce } from "@/hooks/useViewOnce";
import { useNavigate } from "react-router-dom";
import { Loading } from "@/components/Loading";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'https://amda-backend-3aji.onrender.com';

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

const ViewOnce = () => {
  const { captures, isLoading, quota, isPremium } = useViewOnce();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);
  
  const capturedCount = quota?.used || 0;
  const maxCaptures = quota?.limit || 3;
  
  // Pagination
  const itemsPerPage = 12;
  const totalPages = Math.ceil(captures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCaptures = captures.slice(startIndex, endIndex);

  const handleViewMedia = (capture: any) => {
    // Determine media type for viewer
    const viewerType: 'image' | 'video' = 
      ['image', 'sticker'].includes(capture.media_type) ? 'image' : 
      capture.media_type === 'video' ? 'video' : 'image';
    
    const fullMediaUrl = buildMediaUrl(capture.media_url);
    if (!fullMediaUrl) {
      toast.error('URL du média invalide');
      return;
    }
    
    setSelectedMedia({
      url: fullMediaUrl,
      type: viewerType,
      title: `${capture.sender_name} - ${new Date(capture.captured_at).toLocaleString('fr-FR')}`,
    });
  };

  const handleDownload = async (captureId: string) => {
    try {
      const response = await api.viewOnce.download(captureId);
      if (response.success && response.data?.mediaUrl) {
        // Create a temporary link to download
        const link = document.createElement('a');
        link.href = response.data.mediaUrl;
        link.download = `view-once-${captureId}`;
        link.click();
        toast.success('Téléchargement démarré');
      } else {
        toast.error('Impossible de télécharger le média');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">View Once Capturés</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Messages éphémères sauvegardés automatiquement</p>
        </div>
        <div className="flex-shrink-0">
          <PlanBadge plan={isPremium ? 'premium' : 'free'} />
        </div>
      </div>

      {!isPremium && (
        <Card className="border-premium bg-premium/5">
          <CardContent className="pt-6">
            <QuotaCounter
              current={capturedCount}
              max={maxCaptures}
              label="Captures utilisées ce mois"
            />
            <div className="mt-4 p-4 bg-background rounded-lg">
              <p className="text-sm font-medium mb-2">Passez à Premium !</p>
              <p className="text-sm text-muted-foreground mb-3">
                Captures illimitées + galerie complète + statistiques avancées
              </p>
              <Button size="sm" className="bg-premium" onClick={() => navigate('/dashboard/upgrade')}>
                <Crown className="w-4 h-4 mr-2" />
                Débloquer Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Galerie des Captures</CardTitle>
          <CardDescription>
            {isPremium ? "Toutes vos captures" : `${capturedCount} captures disponibles`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loading text="Chargement des View Once..." showLogo={true} />
          ) : captures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Aucune capture</p>
              <p className="text-sm">Les view once reçus seront automatiquement sauvegardés ici</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ios-fade-in">
                {paginatedCaptures.map((capture) => (
                <Card key={capture.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      {capture.media_url && capture.media_type === 'image' ? (
                        <img 
                          src={buildMediaUrl(capture.media_url) || ''} 
                          alt={capture.media_type}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', capture.media_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Image className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                      >
                        {capture.media_type}
                      </Badge>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarFallback className="text-xs">{capture.sender_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{capture.sender_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(capture.captured_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs ios-scale"
                          onClick={() => handleViewMedia(capture)}
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Voir
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs ios-scale"
                          onClick={() => handleDownload(capture.id)}
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Télécharger</span>
                          <span className="sm:hidden">DL</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showFirstLast={false}
                    maxVisible={5}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Media Viewer */}
      {selectedMedia && (
        <MediaViewer
          mediaUrl={selectedMedia.url}
          mediaType={selectedMedia.type}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onDownload={() => {
            const link = document.createElement('a');
            link.href = selectedMedia.url;
            link.download = `view-once-${Date.now()}`;
            link.click();
            toast.success('Téléchargement démarré');
          }}
          title={selectedMedia.title}
        />
      )}
    </div>
  );
};

export default ViewOnce;
