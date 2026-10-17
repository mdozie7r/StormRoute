package com.stormroute.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

import java.util.Locale;

public class MainActivity extends Activity implements LocationListener, TextToSpeech.OnInitListener {
    private static final int REQ_LOC = 7;
    private WebView web;
    private LocationManager lm;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean wantLocation = false;
    private boolean listening = false;
    private boolean navigating = false;
    private long lastGpsFix = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        tts = new TextToSpeech(this, this);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u);
                return true;
            }
        });
        setContentView(web);
        setBars(isNight());
        web.loadUrl("file:///android_asset/index.html");
    }

    private boolean isNight() {
        int mode = getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        return mode == android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }

    private void setBars(boolean dark) {
        Window w = getWindow();
        w.setStatusBarColor(dark ? 0xFF0B1119 : 0xFFEEF2F6);
        w.setNavigationBarColor(dark ? 0xFF141C27 : 0xFFFFFFFF);
        int flags = w.getDecorView().getSystemUiVisibility();
        if (dark) flags &= ~(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        else flags |= (View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        w.getDecorView().setSystemUiVisibility(flags);
    }

    private void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException e) {
            // nothing can open it
        }
    }

    private void js(final String code) {
        if (web == null) return;
        web.post(new Runnable() { public void run() { web.evaluateJavascript(code, null); } });
    }

    // ---------------- location ----------------
    private void requestLocation() {
        wantLocation = true;
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC);
            return;
        }
        beginUpdates();
    }

    private void beginUpdates() {
        if (listening || lm == null) return;
        try {
            Location best = null;
            boolean any = false;
            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this, Looper.getMainLooper());
                best = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                any = true;
            }
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000L, 0f, this, Looper.getMainLooper());
                Location n = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if (best == null || (n != null && n.getTime() > best.getTime())) best = n;
                any = true;
            }
            listening = any;
            if (!any) {
                js("window.__onNativeLocationError&&__onNativeLocationError('Turn on Location in your phone settings')");
                return;
            }
            if (best != null) push(best);
        } catch (SecurityException e) {
            js("window.__onNativeLocationError&&__onNativeLocationError('Allow location access to navigate')");
        }
    }

    private void stopUpdates() {
        if (!listening || lm == null) return;
        try { lm.removeUpdates(this); } catch (Exception e) { }
        listening = false;
    }

    private void push(Location l) {
        double bearing = l.hasBearing() ? l.getBearing() : -1;
        double speed = l.hasSpeed() ? l.getSpeed() : 0;
        double acc = l.hasAccuracy() ? l.getAccuracy() : 50;
        js("window.__onNativeLocation&&__onNativeLocation(" + l.getLatitude() + "," + l.getLongitude() + "," + acc + "," + bearing + "," + speed + ")");
    }

    @Override
    public void onLocationChanged(Location l) {
        if (LocationManager.GPS_PROVIDER.equals(l.getProvider())) lastGpsFix = System.currentTimeMillis();
        else if (System.currentTimeMillis() - lastGpsFix < 10000) return; // prefer GPS while it's working
        push(l);
    }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onProviderDisabled(String provider) { }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        if (requestCode != REQ_LOC) return;
        boolean ok = false;
        for (int r : results) if (r == PackageManager.PERMISSION_GRANTED) ok = true;
        if (ok) beginUpdates();
        else js("window.__onNativeLocationError&&__onNativeLocationError('Location permission is off. You can still search and preview routes.')");
    }

    // ---------------- speech ----------------
    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            tts.setLanguage(Locale.US);
            tts.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build());
            ttsReady = true;
        }
    }

    // ---------------- JS bridge ----------------
    private class Bridge {
        @JavascriptInterface
        public void startLocation() {
            runOnUiThread(new Runnable() { public void run() { requestLocation(); } });
        }

        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady && text != null) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "stormroute");
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() { public void run() {
                navigating = on;
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } });
        }

        @JavascriptInterface
        public void setDarkBars(final boolean dark) {
            runOnUiThread(new Runnable() { public void run() { setBars(dark); } });
        }

        @JavascriptInterface
        public void openGoogleMaps(final double lat, final double lon) {
            runOnUiThread(new Runnable() { public void run() {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=" + lat + "," + lon + "&mode=d"));
                i.setPackage("com.google.android.apps.maps");
                try {
                    startActivity(i);
                } catch (ActivityNotFoundException e) {
                    openExternal(Uri.parse("https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lon + "&travelmode=driving"));
                }
            } });
        }
    }

    // ---------------- lifecycle ----------------
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__onBack ? __onBack() : false", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (!"true".equals(v)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (wantLocation) beginUpdates();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (!navigating) stopUpdates(); // save battery when you leave the app
        if (web != null && !navigating) web.onPause();
    }

    @Override
    protected void onDestroy() {
        stopUpdates();
        if (tts != null) tts.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
