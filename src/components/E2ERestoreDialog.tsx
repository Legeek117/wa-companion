import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import { restorePrivateKeyFromPassphrase } from "@/lib/e2eCrypto";
import { toast } from "sonner";
import logger from "@/lib/logger";

interface E2ERestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onRestored: () => void;
}

/**
 * Demande la phrase secrète ET le mot de passe du compte pour restaurer
 * la clé privée E2E après réinstallation de l'app / perte du localStorage.
 *
 * Le mot de passe du compte est exigé (C2) pour protéger le backup contre
 * un vol silencieux du ciphertext et un brute-force hors-ligne.
 */
export const E2ERestoreDialog = ({
  open,
  onOpenChange,
  userId,
  onRestored,
}: E2ERestoreDialogProps) => {
  const [passphrase, setPassphrase] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!accountPassword.trim()) {
      toast.error('Veuillez saisir votre mot de passe');
      return;
    }
    if (!passphrase.trim()) {
      toast.error('Veuillez saisir votre phrase secrète');
      return;
    }

    setIsRestoring(true);
    try {
      await restorePrivateKeyFromPassphrase(userId, passphrase, accountPassword);
      toast.success('Clé de déchiffrement restaurée !');
      setPassphrase('');
      setAccountPassword('');
      onRestored();
    } catch (error: any) {
      logger.error('E2E restore failed:', error);
      toast.error(error?.message || 'Impossible de restaurer la clé');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Restaurer la clé de déchiffrement
          </DialogTitle>
          <DialogDescription>
            Une sauvegarde de votre clé chiffrée existe sur le serveur.
            Saisissez votre mot de passe et votre phrase secrète pour la restaurer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restore-account-password" className="text-sm">Mot de passe du compte</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="restore-account-password"
                type="password"
                placeholder="Mot de passe AMDA..."
                className="pl-10"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Requise pour sécuriser la récupération de la clé (protection contre le vol).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restore-passphrase" className="text-sm">Phrase secrète</Label>
            <Input
              id="restore-passphrase"
              type="password"
              placeholder="Votre phrase secrète..."
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRestoring) {
                  handleRestore();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              La clé est déchiffrée uniquement sur cet appareil avec votre phrase — elle ne quitte jamais votre téléphone en clair.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isRestoring}>
            Plus tard
          </Button>
          <Button onClick={handleRestore} disabled={isRestoring || !accountPassword.trim() || !passphrase.trim()}>
            {isRestoring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Restauration...
              </>
            ) : (
              'Restaurer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
