#!/usr/bin/env node
'use strict';
// JLANDER Web2APK - Android project generator (runs inside GitHub Actions).
// Usage: node tools/generate.js job/config.json job/icons.zip app-out
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function lum(hex) { var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (.299 * r + .587 * g + .114 * b) / 255; }
function normUrl(u) { u = (u || '').trim(); if (!u) return ''; if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u; return u; }
function hostOf(u) { try { return new URL(normUrl(u)).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; } }

function xe(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,"\\'").replace(/"/g,'\\"')}
function jb(v){return v?'true':'false'}
const LOCAL_URL = 'https://appassets.androidplatform.net/assets/www/index.html';
const SITE_EXT = ['html','htm','css','js','mjs','json','txt','xml','map','webmanifest','png','jpg','jpeg','gif','svg','webp','ico','avif','bmp','woff','woff2','ttf','otf','eot','mp3','ogg','wav','m4a','mp4','webm','pdf'];
const TEST_APP = 'ca-app-pub-3940256099942544~3347511713';
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const BLOB_JS = "(function(){if(window.__jlBlob)return;window.__jlBlob=1;" +
  "function isB(h){return h.indexOf('blob:')===0||h.indexOf('data:')===0}" +
  "function save(name,url){fetch(url).then(function(x){return x.blob()}).then(function(b){var r=new FileReader();r.onloadend=function(){var s=String(r.result||'');var i=s.indexOf(',');AndroidApp.saveBase64(name||'download',b.type||'application/octet-stream',i>-1?s.slice(i+1):'')};r.readAsDataURL(b)}).catch(function(){})}" +
  "document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;var h=a.href||'';if(isB(h)&&a.hasAttribute('download')){e.preventDefault();e.stopPropagation();save(a.getAttribute('download'),h)}},true);" +
  "var oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){var h=this.href||'';if(isB(h)&&this.hasAttribute('download')){save(this.getAttribute('download'),h);return}return oc.apply(this,arguments)};" +
  "})();";

function genJava(c,u,hosts){
  var light=lum(c.themeColor)>.6;
  var tabs=c.tabList||[];
  var imp=[];
  if(c.customTabs)imp.push('androidx.browser.customtabs.CustomTabsIntent');
  if(c.biometric)imp.push('androidx.biometric.BiometricManager','androidx.biometric.BiometricPrompt');
  if(c.admob)imp.push('com.google.android.gms.ads.AdRequest','com.google.android.gms.ads.AdSize','com.google.android.gms.ads.AdView','com.google.android.gms.ads.MobileAds');
  if(c.oneSignalId)imp.push('com.onesignal.Continue','com.onesignal.OneSignal');
  if(c.mode==='local')imp.push('androidx.webkit.WebViewAssetLoader');
  var impTxt=imp.map(function(i){return 'import '+i+';'}).join('\n');
  var q=function(a){return '{ '+a.map(function(x){return JSON.stringify(x)}).join(', ')+' }'};
  return `package ${c.pkg};

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.ArrayList;
import java.util.List;

import android.graphics.Typeface;
import android.webkit.WebResourceResponse;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
${impTxt}

public class MainActivity extends AppCompatActivity {

    // ---- Generated settings ----
    private static final String START_URL = ${JSON.stringify(u)};
    private static final String[] ALLOWED_HOSTS = { ${hosts.map(function(h){return JSON.stringify(h)}).join(', ')} };
    private static final String THEME_COLOR = ${JSON.stringify(c.themeColor)};
    private static final String USER_AGENT = ${JSON.stringify(c.userAgent||'')};
    private static final int SPLASH_MS = ${Math.max(300,Math.min(8000,parseInt(c.splashMs,10)||1500))};
    private static final boolean PULL_REFRESH = ${jb(c.pull)};
    private static final boolean SHOW_PROGRESS = ${jb(c.progress)};
    private static final boolean SPLASH_ENABLED = ${jb(c.splash)};
    private static final boolean OFFLINE_PAGE = ${jb(c.offlinePage)};
    private static final boolean HOST_LOCK = ${jb(c.hostLock)};
    private static final boolean EXIT_CONFIRM = ${jb(c.exitConfirm)};
    private static final boolean DOWNLOADS = ${jb(c.downloads)};
    private static final boolean UPLOAD = ${jb(c.upload)};
    private static final boolean BRIDGE = ${jb(c.bridge)};
    private static final boolean ZOOM = ${jb(c.zoom)};
    private static final boolean FULLSCREEN = ${jb(c.fullscreen)};
    private static final boolean KEEP_AWAKE = ${jb(c.keepAwake)};
    private static final boolean SECURE = ${jb(c.secure)};
    private static final boolean DARK_MODE = ${jb(c.dark)};
    private static final boolean DESKTOP_MODE = ${jb(c.desktop)};
    private static final boolean DEEP_LINK = ${jb(c.deeplink)};
    private static final boolean ENABLE_GEO = ${jb(c.geo)};
    private static final boolean ENABLE_CAM = ${jb(c.cam)};
    private static final boolean ENABLE_MIC = ${jb(c.mic)};
    private static final boolean LIGHT_STATUS = ${jb(light)};
    private static final boolean CUSTOM_TABS = ${jb(c.customTabs)};
    private static final boolean BLOB_DL = ${jb(c.blobDownload)};
    private static final boolean OFFLINE_CACHE = ${jb(c.offlineCache)};
    private static final boolean BIOMETRIC_LOCK = ${jb(c.biometric)};
    private static final boolean PUSH = ${jb(!!c.oneSignalId)};
    private static final boolean ADS = ${jb(c.admob)};
    private static final String AD_BANNER_ID = ${JSON.stringify(c.admobBanner||TEST_BANNER)};
    private static final String[] TAB_LABELS = ${q(tabs.map(function(t){return t.label}))};
    private static final String[] TAB_URLS = ${q(tabs.map(function(t){return t.url}))};
    private static final String BLOB_JS = ${JSON.stringify(c.blobDownload?BLOB_JS:'')};

    private static final int REQ_FILE = 1001, REQ_WEBPERM = 1002, REQ_GEO = 1003, REQ_STORAGE = 1004;

    private WebView webView;
${c.mode==='local'?'    private WebViewAssetLoader assetLoader;\n':''}    private View lockView;
    private boolean locked = false, prompting = false;
    private long pausedAt = 0;
    private SwipeRefreshLayout swipe;
    private ProgressBar progress;
    private View splash, offlineView;
    private WebChromeClient chromeClient;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingWebPerm;
    private GeolocationPermissions.Callback geoCb;
    private String geoOrigin;
    private View customView;
    private WebChromeClient.CustomViewCallback customCb;
    private String startUrl = START_URL;
    private boolean splashMinDone = false, pageDone = false, backOnce = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (SECURE) getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        if (KEEP_AWAKE) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        swipe = findViewById(R.id.swipe_refresh);
        progress = findViewById(R.id.progress_bar);
        splash = findViewById(R.id.splash);
        offlineView = findViewById(R.id.offline_view);
        lockView = findViewById(R.id.lock_view);
        Button retry = findViewById(R.id.retry_button);

        if (FULLSCREEN) enterImmersive(); else applyLightStatus();

        swipe.setEnabled(PULL_REFRESH);
        try { swipe.setColorSchemeColors(Color.parseColor(THEME_COLOR)); } catch (Exception ignored) { }
        swipe.setOnRefreshListener(() -> webView.reload());
        swipe.setOnChildScrollUpCallback((parent, child) -> webView.getScrollY() > 0);

        retry.setOnClickListener(v -> {
            offlineView.setVisibility(View.GONE);
            if (webView.getUrl() == null) webView.loadUrl(startUrl); else webView.reload();
        });

        setupWebView();
        setupTabs();
${c.admob?`
        try {
            MobileAds.initialize(this);
            AdView adView = new AdView(this);
            adView.setAdSize(AdSize.BANNER);
            adView.setAdUnitId(AD_BANNER_ID);
            FrameLayout adBox = findViewById(R.id.ad_container);
            adBox.addView(adView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL));
            adBox.setVisibility(View.VISIBLE);
            adView.loadAd(new AdRequest.Builder().build());
        } catch (Exception ignored) { }
`:''}${c.oneSignalId?`
        try {
            OneSignal.getNotifications().requestPermission(false, Continue.none());
        } catch (Exception ignored) { }
`:''}
        if (BIOMETRIC_LOCK) { locked = true; promptBiometric(); }

        if (SPLASH_ENABLED) {
            handler.postDelayed(() -> { splashMinDone = true; hideSplashIfReady(); }, SPLASH_MS);
            handler.postDelayed(this::forceHideSplash, 12000);
        } else {
            splash.setVisibility(View.GONE);
        }

        Intent in = getIntent();
        if (DEEP_LINK && in != null && in.getData() != null) startUrl = in.getData().toString();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else if (OFFLINE_PAGE && !OFFLINE_CACHE && !isOnline()) {
            showOffline();
        } else {
            webView.loadUrl(startUrl);
        }
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @SuppressWarnings("deprecation")
    private void setupWebView() {
${c.mode==='local'?`        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
`:''}        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(ZOOM);
        s.setBuiltInZoomControls(ZOOM);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setGeolocationEnabled(ENABLE_GEO);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (OFFLINE_CACHE && !isOnline()) s.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);

        String ua = s.getUserAgentString();
        if (DESKTOP_MODE) ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        if (USER_AGENT.length() > 0) ua = USER_AGENT;
        s.setUserAgentString(ua);

        if (DARK_MODE && Build.VERSION.SDK_INT >= 29) s.setForceDark(WebSettings.FORCE_DARK_ON);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        if (BRIDGE) webView.addJavascriptInterface(new Bridge(), "AndroidApp");

        if (DOWNLOADS) {
            webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
                if (Build.VERSION.SDK_INT <= 28 && ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                    Toast.makeText(this, "Allow storage access, then tap download again", Toast.LENGTH_LONG).show();
                    return;
                }
                try {
                    DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
                    r.setMimeType(mimeType);
                    String ck = CookieManager.getInstance().getCookie(url);
                    if (ck != null) r.addRequestHeader("cookie", ck);
                    r.addRequestHeader("User-Agent", userAgent);
                    String fn = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    r.setTitle(fn);
                    r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fn);
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(r);
                    Toast.makeText(this, "Downloading " + fn, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show();
                }
            });
        }

        webView.setWebViewClient(new WebViewClient() {
${c.mode==='local'?`            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

`:''}            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (SHOW_PROGRESS) { progress.setProgress(0); progress.setVisibility(View.VISIBLE); }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                swipe.setRefreshing(false);
                pageDone = true;
                hideSplashIfReady();
                CookieManager.getInstance().flush();
                if (BLOB_DL && BLOB_JS.length() > 0) view.evaluateJavascript(BLOB_JS, null);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && OFFLINE_PAGE) showOffline();
            }
        });

        chromeClient = new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                if (!SHOW_PROGRESS) return;
                progress.setProgress(p);
                progress.setVisibility(p < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (!UPLOAD) return false;
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(() -> {
                    if (!ENABLE_CAM && !ENABLE_MIC) { req.deny(); return; }
                    List<String> need = new ArrayList<>();
                    for (String r : req.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && ENABLE_CAM
                                && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                            need.add(Manifest.permission.CAMERA);
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && ENABLE_MIC
                                && ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                            need.add(Manifest.permission.RECORD_AUDIO);
                    }
                    if (need.isEmpty()) {
                        req.grant(req.getResources());
                    } else {
                        pendingWebPerm = req;
                        ActivityCompat.requestPermissions(MainActivity.this, need.toArray(new String[0]), REQ_WEBPERM);
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                if (!ENABLE_GEO) { cb.invoke(origin, false, false); return; }
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    cb.invoke(origin, true, false);
                } else {
                    geoCb = cb;
                    geoOrigin = origin;
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, REQ_GEO);
                }
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view;
                customCb = callback;
                ((ViewGroup) getWindow().getDecorView()).addView(view, new FrameLayout.LayoutParams(-1, -1));
                enterImmersive();
            }

            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                ((ViewGroup) getWindow().getDecorView()).removeView(customView);
                customView = null;
                if (customCb != null) customCb.onCustomViewHidden();
                if (FULLSCREEN) enterImmersive();
                else { getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE); applyLightStatus(); }
            }
        };
        webView.setWebChromeClient(chromeClient);
    }

    private boolean handleUrl(String url) {
        try {
            if (url.startsWith("intent:")) {
                Intent it = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                try {
                    startActivity(it);
                } catch (Exception e) {
                    String fb = it.getStringExtra("browser_fallback_url");
                    if (fb != null) webView.loadUrl(fb);
                }
                return true;
            }
            if (!(url.startsWith("http://") || url.startsWith("https://"))) {
                if (url.startsWith("about:") || url.startsWith("javascript:") || url.startsWith("data:")
                        || url.startsWith("blob:") || url.startsWith("file:")) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                return true;
            }
            if (HOST_LOCK && !sameSite(url)) {
                openExternal(url);
                return true;
            }
        } catch (Exception e) {
            return true;
        }
        return false;
    }

    private boolean sameSite(String url) {
        String h = Uri.parse(url).getHost();
        if (h == null) return false;
        h = h.toLowerCase();
        for (String a : ALLOWED_HOSTS) {
            if (h.equals(a) || h.endsWith("." + a)) return true;
        }
        return false;
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo n = cm.getActiveNetworkInfo();
            return n != null && n.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void showOffline() {
        offlineView.setVisibility(View.VISIBLE);
        swipe.setRefreshing(false);
        pageDone = true;
        hideSplashIfReady();
    }

    private void hideSplashIfReady() {
        if (splashMinDone && pageDone) forceHideSplash();
        else if (!SPLASH_ENABLED) forceHideSplash();
    }

    private void forceHideSplash() {
        if (splash.getVisibility() != View.VISIBLE) return;
        splash.animate().alpha(0f).setDuration(300).withEndAction(() -> splash.setVisibility(View.GONE)).start();
    }

    @SuppressWarnings("deprecation")
    private void enterImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @SuppressWarnings("deprecation")
    private void applyLightStatus() {
        if (Build.VERSION.SDK_INT >= 23 && LIGHT_STATUS) {
            View d = getWindow().getDecorView();
            d.setSystemUiVisibility(d.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && FULLSCREEN && customView == null) enterImmersive();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && filePathCallback != null) {
            Uri[] r = null;
            if (resultCode == RESULT_OK && data != null) r = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(r);
            filePathCallback = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        boolean ok = res.length > 0;
        for (int r : res) if (r != PackageManager.PERMISSION_GRANTED) ok = false;
        if (code == REQ_WEBPERM && pendingWebPerm != null) {
            if (ok) pendingWebPerm.grant(pendingWebPerm.getResources()); else pendingWebPerm.deny();
            pendingWebPerm = null;
        } else if (code == REQ_GEO && geoCb != null) {
            geoCb.invoke(geoOrigin, ok, false);
            geoCb = null;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (customView != null) { chromeClient.onHideCustomView(); return; }
        if (webView.canGoBack()) { webView.goBack(); return; }
        if (EXIT_CONFIRM && !backOnce) {
            backOnce = true;
            Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
            handler.postDelayed(() -> backOnce = false, 2000);
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        webView.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        pausedAt = System.currentTimeMillis();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        if (BIOMETRIC_LOCK && !locked && !prompting && pausedAt > 0 && System.currentTimeMillis() - pausedAt > 60000) {
            locked = true;
            lockView.setVisibility(View.VISIBLE);
            promptBiometric();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        webView.destroy();
        super.onDestroy();
    }

    private void openExternal(String url) {
${c.customTabs?`        try {
            CustomTabsIntent.Builder b = new CustomTabsIntent.Builder();
            b.setToolbarColor(Color.parseColor(THEME_COLOR));
            b.build().launchUrl(this, Uri.parse(url));
            return;
        } catch (Exception ignored) { }
`:''}        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) { }
    }

    private void setupTabs() {
        if (TAB_URLS.length == 0) return;
        LinearLayout bar = findViewById(R.id.tab_bar);
        bar.setVisibility(View.VISIBLE);
        for (int i = 0; i < TAB_URLS.length; i++) {
            final String tabUrl = TAB_URLS[i];
            TextView t = new TextView(this);
            t.setText(TAB_LABELS[i]);
            t.setGravity(Gravity.CENTER);
            t.setTextSize(13);
            t.setTypeface(null, Typeface.BOLD);
            t.setPadding(0, 28, 0, 28);
            t.setSingleLine(true);
            t.setTextColor(LIGHT_STATUS ? Color.parseColor("#111111") : Color.WHITE);
            t.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            t.setOnClickListener(v -> {
                offlineView.setVisibility(View.GONE);
                webView.loadUrl(tabUrl);
            });
            bar.addView(t);
        }
    }

    private void unlock() {
        locked = false;
        prompting = false;
        lockView.setVisibility(View.GONE);
    }

${c.biometric?`    private void promptBiometric() {
        if (prompting) return;
        prompting = true;
        try {
            int auth = BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
            if (BiometricManager.from(this).canAuthenticate(auth) != BiometricManager.BIOMETRIC_SUCCESS) {
                unlock();
                return;
            }
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(getString(R.string.app_name))
                    .setSubtitle("Unlock to continue")
                    .setAllowedAuthenticators(auth)
                    .build();
            BiometricPrompt prompt = new BiometricPrompt(this, ContextCompat.getMainExecutor(this),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            unlock();
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, CharSequence errString) {
                            finish();
                        }
                    });
            prompt.authenticate(info);
        } catch (Exception e) {
            unlock();
        }
    }`:`    private void promptBiometric() {
        unlock();
    }`}

    // ---- JavaScript bridge: window.AndroidApp ----
    private class Bridge {
        @JavascriptInterface
        public void toast(final String m) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, m, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, "Share"));
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager c = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                c.setPrimaryClip(ClipData.newPlainText("text", text));
                Toast.makeText(MainActivity.this, "Copied", Toast.LENGTH_SHORT).show();
            });
        }

        @SuppressWarnings("deprecation")
        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(ms);
        }

        @JavascriptInterface
        public void openExternal(final String url) {
            MainActivity.this.openExternal(url);
        }

        @JavascriptInterface
        public String deviceInfo() {
            try {
                org.json.JSONObject o = new org.json.JSONObject();
                o.put("platform", "android");
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("model", Build.MODEL);
                o.put("package", getPackageName());
                o.put("online", isOnline());
                return o.toString();
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void saveBase64(final String name, final String mime, final String b64) {
            try {
                byte[] data = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                String bad = "/:*?<>|" + (char) 34;
                StringBuilder sb = new StringBuilder();
                String raw = (name == null || name.trim().length() == 0) ? "download" : name.trim();
                for (int i = 0; i < raw.length(); i++) {
                    char ch = raw.charAt(i);
                    sb.append(bad.indexOf(ch) >= 0 ? '_' : ch);
                }
                String fn = sb.toString();
                if (Build.VERSION.SDK_INT >= 29) {
                    android.content.ContentValues v = new android.content.ContentValues();
                    v.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fn);
                    v.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mime);
                    v.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new java.io.IOException("insert failed");
                    java.io.OutputStream os = getContentResolver().openOutputStream(uri);
                    os.write(data);
                    os.close();
                } else {
                    java.io.File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    dir.mkdirs();
                    java.io.FileOutputStream os = new java.io.FileOutputStream(new java.io.File(dir, fn));
                    os.write(data);
                    os.close();
                }
                toast("Saved to Downloads: " + fn);
            } catch (Exception e) {
                toast("Could not save file");
            }
        }
    }
}
`;
}
function genManifest(c,host){
  var perms=['INTERNET','ACCESS_NETWORK_STATE'];
  if(c.cam)perms.push('CAMERA');
  if(c.mic)perms.push('RECORD_AUDIO','MODIFY_AUDIO_SETTINGS');
  if(c.geo)perms.push('ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION');
  if(c.bridge)perms.push('VIBRATE');
  if(c.oneSignalId)perms.push('POST_NOTIFICATIONS');
  var x='<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n\n';
  perms.forEach(function(p){x+='    <uses-permission android:name="android.permission.'+p+'" />\n'});
  if(c.downloads||c.blobDownload)x+='    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n';
  x+='\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n    <uses-feature android:name="android.hardware.location" android:required="false" />\n\n';
  x+='    <application\n'+(c.oneSignalId?'        android:name=".App"\n':'')+'        android:allowBackup="true"\n        android:icon="@mipmap/ic_launcher"\n        android:roundIcon="@mipmap/ic_launcher_round"\n        android:label="@string/app_name"\n        android:supportsRtl="true"\n        android:hardwareAccelerated="true"\n        android:usesCleartextTraffic="'+jb(c.cleartext||/^http:/i.test(normUrl(c.url)))+'"\n        android:theme="@style/AppTheme">\n\n';
  if(c.admob)x+='        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="'+(c.admobApp||TEST_APP)+'" />\n\n';
  x+='        <activity\n            android:name=".MainActivity"\n            android:exported="true"\n            android:screenOrientation="'+c.orientation+'"\n            android:windowSoftInputMode="adjustResize"\n            android:configChanges="orientation|screenSize|keyboardHidden|keyboard|navigation|smallestScreenSize|screenLayout|uiMode">\n';
  x+='            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n';
  if(c.deeplink)x+='            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="https" android:host="'+host+'" />\n                <data android:scheme="http" android:host="'+host+'" />\n            </intent-filter>\n';
  x+='        </activity>\n    </application>\n</manifest>\n';
  return x;
}
function genLayout(c){
  var sbLight=lum(c.splashBg)>.6;
  return '<?xml version="1.0" encoding="utf-8"?>\n<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent"\n    android:layout_height="match_parent">\n\n'+
  '    <LinearLayout\n        android:layout_width="match_parent"\n        android:layout_height="match_parent"\n        android:orientation="vertical">\n\n'+
  '        <androidx.swiperefreshlayout.widget.SwipeRefreshLayout\n            android:id="@+id/swipe_refresh"\n            android:layout_width="match_parent"\n            android:layout_height="0dp"\n            android:layout_weight="1">\n\n            <WebView\n                android:id="@+id/webview"\n                android:layout_width="match_parent"\n                android:layout_height="match_parent" />\n        </androidx.swiperefreshlayout.widget.SwipeRefreshLayout>\n\n'+
  '        <LinearLayout\n            android:id="@+id/tab_bar"\n            android:layout_width="match_parent"\n            android:layout_height="wrap_content"\n            android:background="@color/theme_color"\n            android:orientation="horizontal"\n            android:visibility="gone" />\n\n'+
  '        <FrameLayout\n            android:id="@+id/ad_container"\n            android:layout_width="match_parent"\n            android:layout_height="wrap_content"\n            android:background="#FFFFFF"\n            android:visibility="gone" />\n    </LinearLayout>\n\n'+
  '    <ProgressBar\n        android:id="@+id/progress_bar"\n        style="?android:attr/progressBarStyleHorizontal"\n        android:layout_width="match_parent"\n        android:layout_height="3dp"\n        android:max="100"\n        android:progressTint="@color/theme_color"\n        android:visibility="gone" />\n\n'+
  '    <LinearLayout\n        android:id="@+id/offline_view"\n        android:layout_width="match_parent"\n        android:layout_height="match_parent"\n        android:background="#FFFFFF"\n        android:clickable="true"\n        android:focusable="true"\n        android:gravity="center"\n        android:orientation="vertical"\n        android:padding="32dp"\n        android:visibility="gone">\n\n        <TextView\n            android:layout_width="wrap_content"\n            android:layout_height="wrap_content"\n            android:text="@string/offline_text"\n            android:textAlignment="center"\n            android:textColor="#222222"\n            android:textSize="16sp" />\n\n        <Button\n            android:id="@+id/retry_button"\n            android:layout_width="wrap_content"\n            android:layout_height="wrap_content"\n            android:layout_marginTop="20dp"\n            android:text="@string/retry" />\n    </LinearLayout>\n\n'+
  '    <FrameLayout\n        android:id="@+id/lock_view"\n        android:layout_width="match_parent"\n        android:layout_height="match_parent"\n        android:background="@color/splash_bg"\n        android:clickable="true"\n        android:focusable="true"\n        android:visibility="'+(c.biometric?'visible':'gone')+'" />\n\n'+
  '    <LinearLayout\n        android:id="@+id/splash"\n        android:layout_width="match_parent"\n        android:layout_height="match_parent"\n        android:background="@color/splash_bg"\n        android:clickable="true"\n        android:focusable="true"\n        android:gravity="center"\n        android:orientation="vertical">\n\n        <ImageView\n            android:layout_width="110dp"\n            android:layout_height="110dp"\n            android:contentDescription="@null"\n            android:src="@drawable/splash_logo" />\n\n        <TextView\n            android:layout_width="wrap_content"\n            android:layout_height="wrap_content"\n            android:layout_marginTop="16dp"\n            android:text="@string/app_name"\n            android:textColor="'+(sbLight?'#111111':'#FFFFFF')+'"\n            android:textSize="20sp"\n            android:textStyle="bold" />\n    </LinearLayout>\n</FrameLayout>\n';
}
function genApp(c){
  return 'package '+c.pkg+';\n\nimport android.app.Application;\n\nimport com.onesignal.OneSignal;\nimport com.onesignal.debug.LogLevel;\n\npublic class App extends Application {\n    @Override\n    public void onCreate() {\n        super.onCreate();\n        OneSignal.getDebug().setLogLevel(LogLevel.NONE);\n        OneSignal.initWithContext(this, '+JSON.stringify(c.oneSignalId)+');\n    }\n}\n';
}
function deps(c){
  var d=["androidx.appcompat:appcompat:1.6.1","androidx.swiperefreshlayout:swiperefreshlayout:1.1.0"];
  if(c.customTabs)d.push("androidx.browser:browser:1.8.0");
  if(c.biometric)d.push("androidx.biometric:biometric:1.1.0");
  if(c.admob)d.push("com.google.android.gms:play-services-ads:23.3.0");
  if(c.oneSignalId)d.push("com.onesignal:OneSignal:[5.1.0, 5.1.99]");
  if(c.mode==='local')d.push("androidx.webkit:webkit:1.11.0");
  return "dependencies {\n"+d.map(function(x){return "    implementation '"+x+"'\n"}).join('')+"}\n";
}

/* ---------------- validation (never trust the config) ---------------- */
const TOGGLES = ['pull','progress','splash','offlinePage','hostLock','exitConfirm','downloads','upload','bridge','zoom','fullscreen','keepAwake','secure','dark','desktop','deeplink','geo','cam','mic','cleartext','customTabs','blobDownload','offlineCache','biometric','aab','admob'];
const JAVA_WORDS = 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null'.split(' ');

function fail(m) { console.error('Config error: ' + m); process.exit(2); }
function cleanStr(s, max) { return String(s == null ? '' : s).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, max); }

function sanitize(r) {
  if (!r || typeof r !== 'object') fail('not an object');
  const c = {};
  c.mode = r.mode === 'local' ? 'local' : 'url';
  const url = c.mode === 'local' ? LOCAL_URL : normUrl(String(r.url || ''));
  if (url.length > 500 || /[\s"'<>\\]/.test(url)) fail('bad url');
  let u; try { u = new URL(url); } catch (e) { fail('bad url'); }
  if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(u.hostname)) fail('bad url');
  c.url = url;
  c.appName = cleanStr(r.appName, 30); if (!c.appName) fail('app name');
  c.pkg = String(r.pkg || '').toLowerCase();
  if (c.pkg.length > 100 || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(c.pkg) || c.pkg.split('.').some(s => JAVA_WORDS.indexOf(s) > -1)) fail('package name');
  c.verName = String(r.verName || '1.0.0'); if (!/^[0-9A-Za-z._-]{1,20}$/.test(c.verName)) fail('version name');
  c.verCode = String(parseInt(r.verCode, 10)); if (!(parseInt(c.verCode, 10) >= 1 && parseInt(c.verCode, 10) <= 2000000000)) fail('version code');
  ['themeColor', 'splashBg'].forEach(k => { const v = String(r[k] || ''); if (!/^#[0-9a-fA-F]{6}$/.test(v)) fail('color ' + k); c[k] = v.toLowerCase(); });
  c.splashMs = String(Math.max(300, Math.min(8000, parseInt(r.splashMs, 10) || 1500)));
  c.orientation = String(r.orientation || 'unspecified'); if (['unspecified', 'portrait', 'landscape'].indexOf(c.orientation) < 0) fail('orientation');
  c.userAgent = cleanStr(r.userAgent, 200);
  c.offlineMsg = cleanStr(r.offlineMsg, 120) || 'No internet connection. Please check your network and try again.';
  c.extraHosts = String(r.extraHosts || '');
  TOGGLES.forEach(k => { c[k] = r[k] === true; });
  c.oneSignalId = String(r.oneSignalId || '').trim();
  if (c.oneSignalId && !/^[0-9a-fA-F-]{36}$/.test(c.oneSignalId)) fail('OneSignal App ID');
  c.admobApp = String(r.admobApp || '').trim();
  if (c.admobApp && !/^ca-app-pub-[0-9]{16}~[0-9]{10}$/.test(c.admobApp)) fail('AdMob App ID');
  c.admobBanner = String(r.admobBanner || '').trim();
  if (c.admobBanner && !/^ca-app-pub-[0-9]{16}\/[0-9]{10}$/.test(c.admobBanner)) fail('AdMob banner ID');
  c.tabList = [];
  String(r.tabs || '').split(/\r?\n/).forEach(line => {
    line = line.trim(); if (!line || c.tabList.length >= 5) return;
    const i = line.indexOf('|'); if (i < 1) fail('tab line needs Label|URL');
    const label = cleanStr(line.slice(0, i), 14), tu = normUrl(line.slice(i + 1).trim());
    let tp; try { tp = new URL(tu); } catch (e) { fail('tab url'); }
    if (!label || tu.length > 500 || /[\s"'<>\\]/.test(tu) || !/^https?:$/.test(tp.protocol) || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(tp.hostname)) fail('tab url');
    c.tabList.push({ label: label, url: tu });
  });
  if (c.tabList.length === 1) fail('tabs need at least 2 entries');
  if (c.blobDownload) c.bridge = true;
  if (c.mode === 'local') { c.offlinePage = false; c.offlineCache = false; c.deeplink = false; c.cleartext = false; }
  return c;
}

/* ---------------- main ---------------- */
function main() {
  const [cfgPath, zipPath, outDir, sitePath] = process.argv.slice(2);
  if (!cfgPath || !zipPath || !outDir) fail('usage: generate.js config.json icons.zip outDir');
  const c = sanitize(JSON.parse(fs.readFileSync(cfgPath, 'utf8')));
  const u = normUrl(c.url), host = hostOf(u), hosts = [host];
  c.extraHosts.split(/[,\s]+/).forEach(h => {
    h = h.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (h && /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(h) && hosts.indexOf(h) < 0 && hosts.length < 11) hosts.push(h);
  });

  c.tabList.forEach(t => { const th = hostOf(t.url); if (th && hosts.indexOf(th) < 0) hosts.push(th); });

  fs.rmSync(outDir, { recursive: true, force: true });
  const W = (rel, txt) => { const f = path.join(outDir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); };

  W('settings.gradle', "pluginManagement {\n    repositories {\n        google()\n        mavenCentral()\n        gradlePluginPortal()\n    }\n}\ndependencyResolutionManagement {\n    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\nrootProject.name = \"WebApp\"\ninclude ':app'\n");
  W('build.gradle', "plugins {\n    id 'com.android.application' version '8.5.2' apply false\n}\n");
  W('gradle.properties', "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n");
  W('app/build.gradle', "plugins {\n    id 'com.android.application'\n}\n\nandroid {\n    namespace '" + c.pkg + "'\n    compileSdk 34\n\n    defaultConfig {\n        applicationId '" + c.pkg + "'\n        minSdk 21\n        targetSdk 34\n        versionCode " + parseInt(c.verCode, 10) + "\n        versionName '" + c.verName + "'\n    }\n\n    signingConfigs {\n        release {\n            storeFile file('../release.keystore')\n            storePassword 'android123'\n            keyAlias 'key0'\n            keyPassword 'android123'\n        }\n    }\n\n    buildTypes {\n        release {\n            minifyEnabled false\n            if (file('../release.keystore').exists()) {\n                signingConfig signingConfigs.release\n            }\n        }\n    }\n\n    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }\n\n    lint {\n        abortOnError false\n        checkReleaseBuilds false\n    }\n}\n\n" + deps(c));
  W('app/proguard-rules.pro', "# no rules needed\n");
  W('app/src/main/AndroidManifest.xml', genManifest(c, host));
  W('app/src/main/java/' + c.pkg.replace(/\./g, '/') + '/MainActivity.java', genJava(c, u, hosts));
  if (c.oneSignalId) W('app/src/main/java/' + c.pkg.replace(/\./g, '/') + '/App.java', genApp(c));
  W('.gradle-tasks', 'assembleDebug assembleRelease' + (c.aab ? ' bundleRelease' : '') + '\n');
  W('app/src/main/res/layout/activity_main.xml', genLayout(c));
  W('app/src/main/res/values/strings.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">' + xe(c.appName) + '</string>\n    <string name="offline_text">' + xe(c.offlineMsg) + '</string>\n    <string name="retry">Retry</string>\n</resources>\n');
  W('app/src/main/res/values/colors.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="theme_color">' + c.themeColor + '</color>\n    <color name="splash_bg">' + c.splashBg + '</color>\n</resources>\n');
  W('app/src/main/res/values/styles.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">\n        <item name="colorPrimary">@color/theme_color</item>\n        <item name="colorPrimaryDark">@color/theme_color</item>\n        <item name="colorAccent">@color/theme_color</item>\n        <item name="android:statusBarColor">@color/theme_color</item>\n        <item name="android:navigationBarColor">@color/theme_color</item>\n        <item name="android:windowBackground">@color/splash_bg</item>\n    </style>\n</resources>\n');

  // icons: validate every entry name before extracting (no path tricks)
  const names = cp.execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean);
  const ok = /^(mipmap-(mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)\/ic_launcher(_round)?\.png|drawable\/splash_logo\.png)$/;
  if (names.length !== 11 || names.some(n => !ok.test(n))) fail('icon package has unexpected files');
  const resDir = path.join(outDir, 'app/src/main/res');
  cp.execFileSync('unzip', ['-o', '-q', zipPath, '-d', resDir]);
  names.forEach(n => { if (!fs.existsSync(path.join(resDir, n))) fail('missing icon ' + n); });

  if (c.mode === 'local') {
    if (!sitePath || !fs.existsSync(sitePath)) fail('site.zip missing');
    const all = cp.execFileSync('unzip', ['-Z1', sitePath], { encoding: 'utf8' }).split('\n').map(x => x.trim()).filter(Boolean);
    const sn = all.filter(n => !n.endsWith('/'));          // folder entries are harmless
    if (!sn.length || sn.length > 400) fail('site zip: bad file count');
    all.forEach(n => {
      const segs = n.split('/');
      const isDir = n.endsWith('/');
      const ext = (n.split('.').pop() || '').toLowerCase();
      if (n.startsWith('/') || n.indexOf('\\') >= 0 || n.indexOf(':') >= 0 || segs.indexOf('..') >= 0 || n.length > 200 || /[\x00-\x1F\x7F]/.test(n) || (!isDir && SITE_EXT.indexOf(ext) < 0)) fail('site zip: unsafe entry ' + n);
    });
    if (sn.indexOf('index.html') < 0) fail('site zip: index.html missing');
    const wwwDir = path.join(outDir, 'app/src/main/assets/www');
    fs.mkdirSync(wwwDir, { recursive: true });
    cp.execFileSync('unzip', ['-o', '-q', sitePath, '-d', wwwDir]);
    console.log('Bundled ' + sn.length + ' site file(s) into assets/www');
  }
  console.log('Project generated for "' + c.appName + '" (' + c.pkg + ') -> ' + outDir);
}
main();
