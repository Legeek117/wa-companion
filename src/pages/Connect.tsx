import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Key, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { toast } from "sonner";

const Connect = () => {
  const navigate = useNavigate();
  const { status, getQR, getPairingCode, isGettingQR, isGettingPairingCode, refetch } = useWhatsApp();
  const [activeMethod, setActiveMethod] = useState<'qr' | 'pairing' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Check if already connected
  useEffect(() => {
    if (status?.status === 'connected') {
      navigate('/dashboard');
    }
  }, [status?.status, navigate]);

  // Poll for QR code or pairing code when active
  useEffect(() => {
    if (activeMethod === 'qr' && status?.qrCode) {
      setQrCode(status.qrCode);
    }
    if (activeMethod === 'pairing' && status?.pairingCode) {
      setPairingCode(status.pairingCode);
    }
  }, [activeMethod, status?.qrCode, status?.pairingCode]);

  // Poll for pairing code if active but not received yet
  useEffect(() => {
    if (activeMethod === 'pairing' && !pairingCode) {
      let pollCount = 0;
      const maxPolls = 30; // 30 * 2s = 60 seconds max
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const result = await refetch();
          if (result.data?.pairingCode) {
            setPairingCode(result.data.pairingCode);
            toast.success('Code de couplage généré !');
            clearInterval(pollInterval);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            toast.error('Le code de couplage n\'a pas pu être généré. Veuillez réessayer ou utiliser le QR Code.');
          }
        } catch (error) {
          console.error('Error polling for pairing code:', error);
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
          }
        }
      }, 2000); // Poll every 2 seconds

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [activeMethod, pairingCode, refetch]);

  const handleQRCode = () => {
    if (activeMethod === 'pairing') {
      toast.error('Veuillez d\'abord arrêter la génération du code de couplage');
      return;
    }

    setActiveMethod('qr');
    setQrCode(null);
    getQR();
  };

  const handlePairingCode = () => {
    if (activeMethod === 'qr') {
      toast.error('Veuillez d\'abord arrêter la génération du code QR');
      return;
    }

    setActiveMethod('pairing');
    setPairingCode(null);
    getPairingCode();
  };

  const handleStop = () => {
    setActiveMethod(null);
    setQrCode(null);
    setPairingCode(null);
    toast.info('Génération arrêtée');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Connexion WhatsApp</CardTitle>
          <CardDescription>
            Choisissez une méthode pour connecter votre compte WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Method */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <QrCode className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Code QR</h3>
                  <p className="text-sm text-muted-foreground">
                    Scannez le code QR avec votre téléphone
                  </p>
                </div>
              </div>
              <Button
                onClick={handleQRCode}
                disabled={activeMethod === 'pairing' || isGettingQR || isGettingPairingCode}
                variant={activeMethod === 'qr' ? 'default' : 'outline'}
              >
                {(activeMethod === 'qr' || isGettingQR) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    En cours...
                  </>
                ) : (
                  'Générer QR'
                )}
              </Button>
            </div>

            {activeMethod === 'qr' && qrCode && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64 border-2 border-border rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Scannez ce code QR avec WhatsApp sur votre téléphone
                  </p>
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    Arrêter
                  </Button>
                </div>
              </div>
            )}

            {activeMethod === 'qr' && !qrCode && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Génération du code QR en cours...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OU</span>
            </div>
          </div>

          {/* Pairing Code Method */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Key className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Code de couplage</h3>
                  <p className="text-sm text-muted-foreground">
                    Entrez le code de couplage dans WhatsApp
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePairingCode}
                disabled={activeMethod === 'qr' || isGettingQR || isGettingPairingCode}
                variant={activeMethod === 'pairing' ? 'default' : 'outline'}
              >
                {(activeMethod === 'pairing' || isGettingPairingCode) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    En cours...
                  </>
                ) : (
                  'Générer Code'
                )}
              </Button>
            </div>

            {activeMethod === 'pairing' && pairingCode && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-32 h-32 border-4 border-primary rounded-lg bg-primary/10 mb-4">
                      <span className="text-3xl font-bold text-primary">{pairingCode}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Entrez ce code dans WhatsApp : Paramètres → Appareils liés → Lier un appareil
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    Arrêter
                  </Button>
                </div>
              </div>
            )}

            {activeMethod === 'pairing' && !pairingCode && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Génération du code de couplage en cours...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status indicator */}
          {status?.status === 'connecting' && (
            <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm text-primary font-medium">
                Connexion en cours...
              </p>
            </div>
          )}

          {status?.status === 'connected' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-500 font-medium">
                WhatsApp connecté avec succès !
              </p>
            </div>
          )}

          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Retour au tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Connect;

