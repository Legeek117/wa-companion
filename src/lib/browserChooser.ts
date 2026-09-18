import { registerPlugin } from '@capacitor/core';

/**
 * Plugin natif local (android/.../BrowserChooserPlugin.java).
 *
 * Ouvre une URL avec l'intent chooser Android : l'utilisateur choisit
 * l'application (navigateur, gestionnaire de téléchargements…) à utiliser
 * pour le téléchargement de l'APK de mise à jour.
 */
export interface BrowserChooserPlugin {
  open(options: { url: string }): Promise<{ opened: boolean }>;
}

export const BrowserChooser = registerPlugin<BrowserChooserPlugin>('BrowserChooser');