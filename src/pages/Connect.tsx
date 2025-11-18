import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Key, Loader2, CheckCircle2, XCircle, Phone } from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { toast } from "sonner";

const Connect = () => {
  const navigate = useNavigate();
  const { 
    status, 
    getQR, 
    getPairingCode, 
    isGettingQR, 
    isGettingPairingCode, 
    refetch,
    reconnect: manualReconnect,
    isReconnecting,
  } = useWhatsApp();
  const [activeMethod, setActiveMethod] = useState<'qr' | 'pairing' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);

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

  // Timeout for "connecting" status that's stuck (5 minutes max)
  useEffect(() => {
    if (status?.status === 'connecting') {
      const connectingStartTime = Date.now();
      const maxConnectingTime = 5 * 60 * 1000; // 5 minutes
      
      const timeoutCheck = setInterval(() => {
        const elapsed = Date.now() - connectingStartTime;
        if (elapsed > maxConnectingTime) {
          console.warn('[Connect] Connection stuck in "connecting" status for too long, resetting...');
          toast.error('La connexion prend trop de temps. Veuillez réessayer.');
          // Reset to disconnected
          setActiveMethod(null);
          setQrCode(null);
          setPairingCode(null);
          setShowPhoneInput(false);
          setPhoneNumber('');
        }
      }, 30000); // Check every 30 seconds

      return () => {
        clearInterval(timeoutCheck);
      };
    }
  }, [status?.status]);

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

    // Show phone input if not already shown
    if (!showPhoneInput) {
      setShowPhoneInput(true);
      return;
    }

    // Validate phone number
    if (!phoneNumber || phoneNumber.trim().length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setActiveMethod('pairing');
    setPairingCode(null);
    getPairingCode(phoneNumber.trim());
  };

  const handleStop = () => {
    setActiveMethod(null);
    setQrCode(null);
    setPairingCode(null);
    setShowPhoneInput(false);
    setPhoneNumber('');
    toast.info('Génération arrêtée');
    
    // Force refetch to update status
    refetch();
  };

  const canManualReconnect = status?.status === 'disconnected' && !!status?.lastSeen;
  const lastSeenDisplay = status?.lastSeen
    ? new Date(status.lastSeen).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

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

          {/* Pairing Code Method */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OU</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Key className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Code de couplage</h3>
                  <p className="text-sm text-muted-foreground">
                    Entrez votre numéro de téléphone pour générer un code
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
                  'Générer code'
                )}
              </Button>
            </div>

            {/* Phone number input */}
            {showPhoneInput && (
              <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="229 XX XX XX XX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={activeMethod === 'pairing' || isGettingPairingCode}
                      className="flex-1"
                    />
                    <Button
                      onClick={handlePairingCode}
                      disabled={!phoneNumber || phoneNumber.trim().length < 8 || activeMethod === 'pairing' || isGettingPairingCode}
                      variant="outline"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Format: 229 XX XX XX XX ou 229 XX XX XX XX XX
                  </p>
                </div>
              </div>
            )}

            {/* Pairing code display */}
            {activeMethod === 'pairing' && pairingCode && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium">Votre code de couplage</p>
                    <div className="text-3xl font-bold tracking-wider font-mono bg-background p-4 rounded-lg border-2 border-primary">
                      {pairingCode}
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Entrez ce code dans WhatsApp sur votre téléphone
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

          {canManualReconnect && (
            <div className="p-4 border border-dashed border-primary/40 rounded-lg bg-primary/5 space-y-3">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Session précédente détectée
                </p>
                {lastSeenDisplay && (
                  <p className="text-xs text-muted-foreground">
                    Dernière activité enregistrée : {lastSeenDisplay}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Relancez automatiquement le bot sans rescanner de code.
                </p>
              </div>
              <Button
                onClick={() => manualReconnect()}
                disabled={isReconnecting}
                className="w-full sm:w-auto"
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reconnexion...
                  </>
                ) : (
                  'Se reconnecter'
                )}
              </Button>
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

