package com.amda.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Local plugin : ouvre une URL avec l'intent chooser Android.
 *
 * Utilisé pour le téléchargement de la mise à jour APK : au lieu d'ouvrir
 * systématiquement le navigateur par défaut, on propose à l'utilisateur de
 * choisir l'application (navigateur, gestionnaire de téléchargements, etc.)
 * qu'il souhaite utiliser.
 */
@CapacitorPlugin(name = "BrowserChooser")
public class BrowserChooserPlugin extends Plugin {

  @PluginMethod
  public void open(PluginCall call) {
    String url = call.getString("url");
    if (url == null || url.trim().isEmpty()) {
      call.reject("URL is required");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      call.reject("Only http(s) URLs are supported");
      return;
    }

    try {
      Intent viewIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));

      // Choisir où ouvrir le lien : navigateur par défaut ou autre application
      Intent chooser = Intent.createChooser(viewIntent, "Ouvrir avec…");
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(chooser);

      JSObject result = new JSObject();
      result.put("opened", true);
      call.resolve(result);
    } catch (Exception e) {
      call.reject("Could not open URL: " + e.getMessage());
    }
  }
}