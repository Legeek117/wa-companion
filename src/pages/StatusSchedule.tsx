import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useQuota } from "@/hooks/useQuota";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CalendarClock,
  Trash2,
  Upload,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || 'https://wa-companion.onrender.com').replace(/[\/\.]+$/, '');

// Helper function to build full media URL
const buildMediaUrl = (mediaUrl: string | null): string | null => {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
    return mediaUrl;
  }
  return `${API_URL}${mediaUrl}`;
};

interface ScheduledStatusItem {
  id: string;
  mediaUrl?: string | null;
  caption?: string | null;
  scheduledAt: string;
  publishedAt?: string | null;
  status: 'pending' | 'published' | 'failed' | 'canceled';
  errorMessage?: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<ScheduledStatusItem['status'], { label: string; className: string }> = {
  pending: { label: 'Programmé', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  published: { label: 'Publié', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  failed: { label: 'Échec', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
  canceled: { label: 'Annulé', className: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30' },
};

const StatusSchedule = () => {
  const { user } = useAuth();
  const { quota } = useQuota();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploading, setUploading] = useState(false);

  const quotaStatuses = quota?.scheduledStatuses;
  const limitLabel = quotaStatuses?.limit === Infinity ? '∞' : String(quotaStatuses?.limit ?? '—');

  // ---- Liste des statuts programmés ----
  const { data: statuses, isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['scheduled-status'],
    queryFn: async () => {
      const res = await api.scheduledStatus.list();
      return res.success && res.data ? (res.data as ScheduledStatusItem[]) : [];
    },
    refetchInterval: 60 * 1000, // rafraîchit pour voir la publication surveillée
  });

  // ---- Création ----
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Veuillez choisir une image ou une vidéo.');
      if (!scheduledAt) throw new Error('Veuillez choisir une date et heure de publication.');
      if (new Date(scheduledAt).getTime() <= Date.now()) {
        throw new Error('La date de publication doit être dans le futur.');
      }

      const uploadRes = await api.media.uploadScheduledStatus(file);
      if (!uploadRes.success || !uploadRes.data?.mediaUrl) {
        throw new Error(uploadRes.error?.message || "Échec de l'upload du média.");
      }
      const mediaUrl = uploadRes.data.mediaUrl;
      const mediaType = file.type;

      const createRes = await api.scheduledStatus.create({
        mediaUrl,
        mediaType,
        caption: caption.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      if (!createRes.success) {
        throw new Error(createRes.error?.message || "Échec de la programmation du statut.");
      }
      return createRes.data;
    },
    onSuccess: () => {
      toast.success('Statut programmé !', { description: 'Il sera publié automatiquement à l’heure choisie.' });
      queryClient.invalidateQueries({ queryKey: ['scheduled-status'] });
      queryClient.invalidateQueries({ queryKey: ['quota'] });
      setFile(null);
      setPreviewUrl(null);
      setCaption('');
      setScheduledAt('');
    },
    onError: (error: Error) => {
      toast.error("Impossible de programmer le statut", { description: error.message });
    },
  });

  // ---- Suppression ----
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.scheduledStatus.delete(id);
      if (!res.success) throw new Error(res.error?.message || 'Échec de la suppression.');
    },
    onSuccess: () => {
      toast.success('Programmation supprimée.');
      queryClient.invalidateQueries({ queryKey: ['scheduled-status'] });
    },
    onError: (error: Error) => {
      toast.error('Suppression impossible', { description: error.message });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) return;

    const isImage = selected.type.startsWith('image/');
    const isVideo = selected.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Format non supporté', { description: 'Choisissez une image (jpg, png, gif, webp) ou une vidéo (mp4).' });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux', { description: 'La taille maximale est de 10 Mo.' });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const minDatetime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Programmer un Statut
          </h1>
          <p className="text-sm text-muted-foreground">
            Publiez une image ou une vidéo sur votre statut WhatsApp à l’heure choisie.
          </p>
        </div>
        {quotaStatuses && (
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {quotaStatuses.used}/{limitLabel} programmés
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Formulaire ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nouvelle programmation</CardTitle>
            <CardDescription>
              {quotaStatuses?.limit !== Infinity && quotaStatuses && quotaStatuses.remaining <= 0
                ? 'Quota atteint pour le plan gratuit — passez Premium pour programmer sans limite.'
                : 'Le statut sera publié automatiquement depuis votre session WhatsApp connectée.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="media">Média (image ou vidéo, max 10 Mo)</Label>
              <Input
                id="media"
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
              />
              {previewUrl && (
                <div className="mt-2 flex items-center justify-center rounded-lg border bg-muted/30 overflow-hidden max-h-56">
                  {file?.type.startsWith('image/') ? (
                    <img src={previewUrl} alt="Aperçu" className="max-h-56 object-contain" />
                  ) : (
                    <video src={previewUrl} controls className="max-h-56 object-contain" />
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date et heure de publication</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                min={minDatetime}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              {scheduledAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(scheduledAt).toLocaleString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Légende (optionnel)</Label>
              <Textarea
                id="caption"
                placeholder="Texte affiché avec votre statut…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              disabled={!file || !scheduledAt || createMutation.isPending}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {createMutation.isPending || uploading ? 'Programmation…' : 'Programmer le statut'}
            </Button>
          </CardContent>
        </Card>

        {/* ---- Liste ---- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statuts programmés</CardTitle>
            <CardDescription>Mis à jour toutes les minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingStatuses && (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {!isLoadingStatuses && (!statuses || statuses.length === 0) && (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Aucune programmation pour le moment.</p>
              </div>
            )}

            {statuses?.map((item) => {
              const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
              const fullMediaUrl = buildMediaUrl(item.mediaUrl || null);
              const isImage = fullMediaUrl && !/\.(mp4|mov|avi)(\?|$)/i.test(fullMediaUrl);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3 bg-card"
                >
                  <div className="h-14 w-14 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                    {fullMediaUrl ? (
                      isImage ? (
                        <img src={fullMediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <video src={fullMediaUrl} className="h-full w-full object-cover" muted preload="metadata" />
                      )
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.scheduledAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {item.caption && (
                      <p className="text-sm truncate mt-1 text-muted-foreground">{item.caption}</p>
                    )}
                    {item.status === 'failed' && item.errorMessage && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> {item.errorMessage}
                      </p>
                    )}
                    {item.status === 'published' && (
                      <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Publié le{' '}
                        {new Date(item.publishedAt || item.scheduledAt).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>

                  {item.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatusSchedule;