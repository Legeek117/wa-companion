import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Play } from "lucide-react";
import { useEffect, useState } from "react";

interface MediaViewerProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  title?: string;
}

export const MediaViewer = ({
  mediaUrl,
  mediaType,
  isOpen,
  onClose,
  onDownload,
  title,
}: MediaViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, mediaUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError("Impossible de charger le média");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 bg-black/95 border-none">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            {title && (
              <h3 className="text-white font-semibold text-sm sm:text-base truncate flex-1 mr-4">
                {title}
              </h3>
            )}
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDownload}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Media Content */}
          <div className="w-full h-full flex items-center justify-center p-4">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            
            {error ? (
              <div className="text-white text-center">
                <p className="text-lg mb-4">{error}</p>
                <Button onClick={onClose} variant="outline">
                  Fermer
                </Button>
              </div>
            ) : (
              <>
                {mediaType === 'image' ? (
                  <img
                    src={mediaUrl}
                    alt={title || "Image"}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`max-w-full max-h-full object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    onLoadedData={handleLoad}
                    onError={handleError}
                    className={`max-w-full max-h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                  >
                    Votre navigateur ne supporte pas la lecture de vidéos.
                  </video>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

