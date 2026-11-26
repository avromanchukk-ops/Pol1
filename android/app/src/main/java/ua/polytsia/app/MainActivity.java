package ua.polytsia.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int FILE_REQ = 42;
    private WebView web;
    private ValueCallback<Uri[]> fileCb;
    private Uri cameraUri;
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0C0907"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0C0907"));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        // Відступи під статус-бар і навігацію (Android 15 вмикає edge-to-edge примусово)
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                top = i.top; bottom = i.bottom;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
            return insets;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.addJavascriptInterface(new Bridge(), "Native");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u.toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                cameraUri = null;
                boolean image = false;
                for (String t : params.getAcceptTypes()) if (t != null && t.startsWith("image")) image = true;
                try {
                    if (image) {
                        if (params.isCaptureEnabled()) {
                            Intent cam = cameraIntent();
                            if (cam != null) { startActivityForResult(cam, FILE_REQ); return true; }
                        }
                        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                        pick.addCategory(Intent.CATEGORY_OPENABLE);
                        pick.setType("image/*");
                        startActivityForResult(Intent.createChooser(pick, "Оберіть фото"), FILE_REQ);
                        return true;
                    }
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    startActivityForResult(Intent.createChooser(i, "Файл резервної копії"), FILE_REQ);
                } catch (ActivityNotFoundException e) { fileCb = null; return false; }
                return true;
            }
        });

        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/index.html");
    }

    private void handleBack() {
        web.evaluateJavascript("(window.onBackPressed ? window.onBackPressed() : 'exit')", r -> {
            if (r == null || r.contains("exit")) finish();
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() { handleBack(); }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == FILE_REQ && fileCb != null) {
            Uri[] r = null;
            if (res == RESULT_OK) {
                if (data != null && data.getData() != null) r = new Uri[]{data.getData()};
                else if (cameraUri != null) {
                    File f = new File(PhotoProvider.dir(this), cameraUri.getLastPathSegment());
                    if (f.exists() && f.length() > 0) r = new Uri[]{cameraUri};
                }
            }
            cameraUri = null;
            fileCb.onReceiveValue(r);
            fileCb = null;
        }
    }

    @Override
    protected void onDestroy() { pool.shutdownNow(); web.destroy(); super.onDestroy(); }

    /** Інтент камери: знімок пишеться в кеш через PhotoProvider. Старі знімки прибираємо. */
    private Intent cameraIntent() {
        Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cam.resolveActivity(getPackageManager()) == null) return null;
        File d = PhotoProvider.dir(this);
        File[] old = d.listFiles();
        if (old != null) for (File f : old) if (System.currentTimeMillis() - f.lastModified() > 600000) f.delete();
        String name = "cam_" + System.currentTimeMillis() + ".jpg";
        try { new File(d, name).createNewFile(); } catch (Exception ignored) {}
        cameraUri = Uri.parse("content://" + PhotoProvider.AUTH + "/" + name);
        cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        cam.setClipData(android.content.ClipData.newRawUri("photo", cameraUri));
        return cam;
    }

    private void openExternal(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { Toast.makeText(this, "Не вдалося відкрити посилання", Toast.LENGTH_SHORT).show(); }
    }

    private void callback(String id, int status, String body) {
        String js = "window.__nativeCb(" + JSONObject.quote(id) + "," + status + "," + JSONObject.quote(body == null ? "" : body) + ")";
        ui.post(() -> web.evaluateJavascript(js, null));
    }

    /** Міст JS → Android. Робить мережеві запити без обмежень CORS (BGG, RSS новин). */
    private class Bridge {
        @JavascriptInterface
        public void fetch(String id, String url, String headersJson) {
            pool.execute(() -> {
                HttpURLConnection c = null;
                try {
                    String target = url;
                    for (int attempt = 0; attempt < 4; attempt++) {
                        c = (HttpURLConnection) new URL(target).openConnection();
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(20000);
                        c.setRequestProperty("User-Agent", "Polytsia/1.0 (Android board game tracker)");
                        JSONObject h = new JSONObject(headersJson == null || headersJson.isEmpty() ? "{}" : headersJson);
                        Iterator<String> keys = h.keys();
                        while (keys.hasNext()) { String k = keys.next(); c.setRequestProperty(k, h.getString(k)); }
                        int code = c.getResponseCode();
                        // BGG відповідає 202, поки готує дані (колекції) — чекаємо й повторюємо
                        if (code == 202 && attempt < 3) { c.disconnect(); Thread.sleep(2500); continue; }
                        if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) { target = c.getHeaderField("Location"); c.disconnect(); continue; }
                        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                        String body = in == null ? "" : readAll(in);
                        callback(id, code == 202 ? 200 : code, body);
                        return;
                    }
                    callback(id, 504, "");
                } catch (Exception e) {
                    callback(id, 0, String.valueOf(e.getMessage()));
                } finally {
                    if (c != null) c.disconnect();
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            v.vibrate(VibrationEffect.createOneShot(Math.max(1, Math.min(ms, 800)), VibrationEffect.DEFAULT_AMPLITUDE));
        }

        @JavascriptInterface
        public void share(String text) {
            ui.post(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                startActivity(Intent.createChooser(i, "Поділитися"));
            });
        }

        @JavascriptInterface
        public void keepAwake(boolean on) {
            ui.post(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void open(String url) { ui.post(() -> openExternal(url)); }

        @JavascriptInterface
        public void saveFile(String name, String content) {
            pool.execute(() -> {
                String msg;
                try {
                    byte[] data = content.getBytes(StandardCharsets.UTF_8);
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                        cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new Exception("MediaStore");
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) { if (os == null) throw new Exception("stream"); os.write(data); }
                        msg = "Збережено в Завантаження: " + name;
                    } else {
                        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                        File f = new File(dir, name);
                        try (FileOutputStream os = new FileOutputStream(f)) { os.write(data); }
                        msg = "Збережено: " + f.getAbsolutePath();
                    }
                } catch (Exception e) {
                    msg = "Не вдалося зберегти файл";
                }
                final String m = msg;
                ui.post(() -> Toast.makeText(MainActivity.this, m, Toast.LENGTH_LONG).show());
            });
        }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
        in.close();
        return bo.toString("UTF-8");
    }
}
