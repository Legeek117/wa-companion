package com.amda.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Plugin local : ouverture d'URL avec l'intent chooser Android
    registerPlugin(BrowserChooserPlugin.class);
    super.onCreate(savedInstanceState);
  }
}