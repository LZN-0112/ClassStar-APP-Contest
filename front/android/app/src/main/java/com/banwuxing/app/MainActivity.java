package com.banwuxing.app;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.ViewGroup;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PUSH_PREFS = "bwx_push";
    private static final String PREF_PUSH_CONSENT = "consent_granted";
    private static final String PREF_PENDING_OPEN = "pending_open";
    private static java.lang.ref.WeakReference<MainActivity> activeActivity;

    /** Web 层是否已注册 window.__banwuxingPushOpen，注册后才可安全注入通知点击事件 */
    private boolean pushReady = false;

    /** 同一次通知点击可能同时经由 receiver 广播与启动 Intent 到达，做 3 秒内同内容去重 */
    private static String lastPushOpenPayload;
    private static long lastPushOpenAt;

    @Override
    public void onResume() {
        super.onResume();
        activeActivity = new java.lang.ref.WeakReference<>(this);
        if (pushReady) {
            dispatchPendingPushOpen();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 注册微信登录插件（必须在 super.onCreate 之前，Bridge 初始化时收集插件列表）
        registerPlugin(WechatPlugin.class);
        super.onCreate(savedInstanceState);

        // 沉浸式边缘到边缘：内容延伸到系统状态栏/导航栏后面
        // 注意：必须在 super.onCreate 之后再设置，避免被 Capacitor(BridgeActivity) 覆盖回默认状态栏
        EdgeToEdge.enable(this);

        // 默认深色图标（App 多数页面为浅色背景），具体页面由 Web 层 useStatusBarStyle 切换
        androidx.core.view.WindowInsetsControllerCompat insetsController =
                new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);

        // WebView 不透明背景，防止启动页蓝色渐变透过 WebView 形成蓝色波浪线
        this.bridge.getWebView().setBackgroundColor(0xFFFFFFFF);

        // WebView 不做系统窗口适配，避免双重顶部间距
        this.bridge.getWebView().setFitsSystemWindows(false);
        this.bridge.getWebView().setPadding(0, 0, 0, 0);
        ViewGroup.LayoutParams lp = this.bridge.getWebView().getLayoutParams();
        if (lp instanceof ViewGroup.MarginLayoutParams) {
            ((ViewGroup.MarginLayoutParams) lp).setMargins(0, 0, 0, 0);
        }

        // 启用 WebView 远程调试：仅调试包开启，正式包关闭，避免任何 USB 连接都能查看页面与数据
        boolean debuggable = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 向 Web 层暴露状态栏高度，用于 CSS 安全区变量兜底
        this.bridge.getWebView().addJavascriptInterface(new AndroidBridge(this, this.bridge.getWebView()), "AndroidBridge");

        // 桥接 WebView 下载：拦截 a[download] 并交给系统下载管理器
        this.bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("正在下载文件");
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype));
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimetype));
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.enqueue(request);
                    android.widget.Toast.makeText(this, "开始下载，请到通知栏查看进度", android.widget.Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                android.widget.Toast.makeText(this, "下载失败: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
            }
        });

        // 冷启动时极光会把通知 extras 放进启动 Intent（savedInstanceState 非空说明是页面重建，不再重复处理）
        if (savedInstanceState == null) {
            handlePushIntent(getIntent());
        }

        initJPushIfConsented();
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        // singleTask：App 在前台/后台时点击通知走这里
        handlePushIntent(intent);
    }

    /** 从极光通知点击的启动 Intent 中取出 extras，与 receiver 广播互为兜底 */
    private void handlePushIntent(android.content.Intent intent) {
        if (intent == null) return;
        String extras = intent.getStringExtra("cn.jpush.android.EXTRA");
        if (extras == null || extras.isEmpty()) return;
        intent.removeExtra("cn.jpush.android.EXTRA");
        onPushNotificationOpened(this, extras);
    }

    /**
     * 合规初始化：只有用户在隐私弹窗中点击同意后，Web 层才会写入 consent 标记并触发初始化。
     * 已同意过的设备在 onCreate 阶段立即初始化，保证杀进程后仍能收到推送。
     */
    private void initJPushIfConsented() {
        if (!getSharedPreferences(PUSH_PREFS, MODE_PRIVATE).getBoolean(PREF_PUSH_CONSENT, false)) return;
        startJPush();
    }

    /** 记录授权并初始化极光推送（可重复调用，SDK 内部幂等） */
    private void grantPushConsent() {
        getSharedPreferences(PUSH_PREFS, MODE_PRIVATE).edit().putBoolean(PREF_PUSH_CONSENT, true).apply();
        startJPush();
    }

    private void startJPush() {
        try {
            boolean debuggable = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            cn.jpush.android.api.JPushInterface.setDebugMode(debuggable);
            cn.jpush.android.api.JPushInterface.init(getApplicationContext());
        } catch (Throwable t) {
            android.util.Log.e("JPUSH", "init failed", t);
        }
        // Android 13+ 需要运行时通知权限，否则推送到达但不会在通知栏展示
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 0x4A50);
        }
    }

    /**
     * 通知点击回调（由 PushMessageReceiver 调用）：
     * 页面已就绪时直接注入 JS 跳转，否则先落盘，等 Web 层就绪后领取，避免冷启动丢失路由。
     */
    static void onPushNotificationOpened(Context context, String extrasJson) {
        if (extrasJson == null || extrasJson.isEmpty()) return;
        long now = android.os.SystemClock.elapsedRealtime();
        if (extrasJson.equals(lastPushOpenPayload) && now - lastPushOpenAt < 3000) return;
        lastPushOpenPayload = extrasJson;
        lastPushOpenAt = now;
        MainActivity activity = activeActivity == null ? null : activeActivity.get();
        if (activity != null && activity.deliverPushOpen(extrasJson)) return;
        context.getSharedPreferences(PUSH_PREFS, MODE_PRIVATE)
                .edit().putString(PREF_PENDING_OPEN, extrasJson).apply();
    }

    private boolean deliverPushOpen(String extrasJson) {
        if (!pushReady) return false;
        try {
            // 校验为合法 JSON，避免把异常内容拼进 evaluateJavascript
            new org.json.JSONObject(extrasJson);
        } catch (Throwable t) {
            return true;
        }
        runOnUiThread(() -> {
            try {
                bridge.getWebView().evaluateJavascript(
                        "window.__banwuxingPushOpen && window.__banwuxingPushOpen(" + extrasJson + ")", null);
            } catch (Throwable ignored) {
            }
        });
        return true;
    }

    private void dispatchPendingPushOpen() {
        android.content.SharedPreferences sp = getSharedPreferences(PUSH_PREFS, MODE_PRIVATE);
        String pending = sp.getString(PREF_PENDING_OPEN, null);
        if (pending == null) return;
        sp.edit().remove(PREF_PENDING_OPEN).apply();
        deliverPushOpen(pending);
    }

    private void markPushReady() {
        pushReady = true;
        activeActivity = new java.lang.ref.WeakReference<>(this);
        dispatchPendingPushOpen();
    }

    private String consumePendingPushOpen() {
        android.content.SharedPreferences sp = getSharedPreferences(PUSH_PREFS, MODE_PRIVATE);
        String pending = sp.getString(PREF_PENDING_OPEN, null);
        if (pending != null) {
            sp.edit().remove(PREF_PENDING_OPEN).apply();
        }
        return pending == null ? "" : pending;
    }

    /**
     * JS 桥：返回系统状态栏高度（物理像素），Web 端换算后注入 --status-bar-height
     */
    public static class AndroidBridge {
        private final android.content.Context context;
        private final WebView webView;
        AndroidBridge(android.content.Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        /** JS 桥：用户同意隐私政策后调用，初始化极光推送并记住授权 */
        @JavascriptInterface
        public void initJPush() {
            if (context instanceof MainActivity) {
                ((MainActivity) context).grantPushConsent();
            }
        }

        /** JS 桥：获取极光 Registration ID；未初始化或尚未注册成功时返回空串 */
        @JavascriptInterface
        public String getRegistrationId() {
            try {
                return cn.jpush.android.api.JPushInterface.getRegistrationID(context);
            } catch (Throwable t) {
                return "";
            }
        }

        /** JS 桥：Web 层已注册 window.__banwuxingPushOpen，可安全注入通知点击事件 */
        @JavascriptInterface
        public void setPushReady() {
            if (context instanceof MainActivity) {
                ((MainActivity) context).markPushReady();
            }
        }

        /** JS 桥：领取启动期间点击的通知 extras（JSON 字符串，无则空串） */
        @JavascriptInterface
        public String consumePushOpen() {
            if (context instanceof MainActivity) {
                return ((MainActivity) context).consumePendingPushOpen();
            }
            return "";
        }

        @JavascriptInterface
        public int getStatusBarHeight() {
            // Android 11+：用 window insets 获取真实状态栏高度（edge-to-edge 下比 status_bar_height dimen 更可靠）
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                try {
                    android.view.Window window = ((android.app.Activity) context).getWindow();
                    android.graphics.Insets insets = window.getDecorView().getRootWindowInsets()
                            .getInsets(android.view.WindowInsets.Type.statusBars());
                    return insets.top;
                } catch (Throwable ignored) { }
            }
            android.content.res.Resources res = android.content.res.Resources.getSystem();
            int resId = res.getIdentifier("status_bar_height", "dimen", "android");
            return resId > 0 ? res.getDimensionPixelSize(resId) : 0;
        }

        /**
         * JS 桥：返回系统底部导航（含手势条）安全区高度（物理像素），Web 端换算后注入 --safe-bottom，
         * 避免底部固定栏/说明文字被系统手势条或三键导航遮挡。
         */
        @JavascriptInterface
        public int getNavigationBarHeight() {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                try {
                    android.view.Window window = ((android.app.Activity) context).getWindow();
                    android.graphics.Insets insets = window.getDecorView().getRootWindowInsets()
                            .getInsets(android.view.WindowInsets.Type.navigationBars());
                    return insets.bottom;
                } catch (Throwable ignored) { }
            }
            android.content.res.Resources res = android.content.res.Resources.getSystem();
            int resId = res.getIdentifier("navigation_bar_height", "dimen", "android");
            return resId > 0 ? res.getDimensionPixelSize(resId) : 0;
        }

        /**
         * 分片保存：开始写入。避免把上百 MB 文件整体转成 Base64 字符串导致 WebView OOM。
         * 与 appendBase64Chunk / endBase64File / abortBase64File 成对使用。
         */
        private java.io.OutputStream pendingStream;
        private Uri pendingUri;
        private java.io.File pendingFile;
        private String pendingDisplayPath;

        @JavascriptInterface
        public synchronized boolean beginBase64File(String fileName, String mimeType) {
            abortBase64File();
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri uri = context.getContentResolver()
                            .insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) {
                        return false;
                    }
                    java.io.OutputStream os = context.getContentResolver().openOutputStream(uri);
                    if (os == null) {
                        context.getContentResolver().delete(uri, null, null);
                        return false;
                    }
                    pendingUri = uri;
                    pendingStream = os;
                    pendingDisplayPath = Environment.DIRECTORY_DOWNLOADS + "/" + fileName;
                    return true;
                }
                java.io.File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    return false;
                }
                if (!dir.exists() && !dir.mkdirs()) {
                    return false;
                }
                java.io.File file = new java.io.File(dir, fileName);
                pendingStream = new java.io.FileOutputStream(file);
                pendingFile = file;
                pendingDisplayPath = file.getAbsolutePath();
                return true;
            } catch (Throwable e) {
                abortBase64File();
                return false;
            }
        }

        @JavascriptInterface
        public synchronized boolean appendBase64Chunk(String base64Chunk) {
            if (pendingStream == null || base64Chunk == null) {
                return false;
            }
            try {
                byte[] data = android.util.Base64.decode(base64Chunk, android.util.Base64.DEFAULT);
                pendingStream.write(data);
                return true;
            } catch (Throwable e) {
                return false;
            }
        }

        @JavascriptInterface
        public synchronized String endBase64File() {
            if (pendingStream == null) {
                return null;
            }
            String result = pendingDisplayPath;
            try {
                pendingStream.flush();
                pendingStream.close();
                if (pendingUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0);
                    context.getContentResolver().update(pendingUri, values, null, null);
                }
            } catch (Throwable e) {
                result = null;
            } finally {
                pendingStream = null;
                pendingUri = null;
                pendingFile = null;
                pendingDisplayPath = null;
            }
            return result;
        }

        @JavascriptInterface
        public synchronized void abortBase64File() {
            if (pendingStream != null) {
                try {
                    pendingStream.close();
                } catch (Throwable ignored) {
                }
            }
            if (pendingUri != null) {
                try {
                    context.getContentResolver().delete(pendingUri, null, null);
                } catch (Throwable ignored) {
                }
            }
            if (pendingFile != null && pendingFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                pendingFile.delete();
            }
            pendingStream = null;
            pendingUri = null;
            pendingFile = null;
            pendingDisplayPath = null;
        }

        /**
         * 保存 Base64 文件到手机本地（供导出 CSV 等使用）。
         * Android 10+ 写入公共“下载”目录（MediaStore，无需权限）；
         * 更低版本写入应用专属下载目录。成功返回保存位置，失败返回 null。
         */
        @JavascriptInterface
        public String saveBase64File(String fileName, String base64Data, String mimeType) {
            try {
                byte[] data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri uri = context.getContentResolver()
                            .insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) {
                        return null;
                    }
                    java.io.OutputStream os = context.getContentResolver().openOutputStream(uri);
                    if (os == null) {
                        return null;
                    }
                    os.write(data);
                    os.close();
                    values.clear();
                    values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                    return Environment.DIRECTORY_DOWNLOADS + "/" + fileName;
                }
                java.io.File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    return null;
                }
                if (!dir.exists() && !dir.mkdirs()) {
                    return null;
                }
                java.io.File file = new java.io.File(dir, fileName);
                java.io.FileOutputStream fos = new java.io.FileOutputStream(file);
                fos.write(data);
                fos.close();
                return file.getAbsolutePath();
            } catch (Throwable e) {
                return null;
            }
        }

        /**
         * 保存 Base64 图片到系统相册（Pictures/班务星）。
         * Android 10+ 通过 MediaStore 写入，无需存储权限；
         * 更低版本无法免权限写入相册，返回 null 由 Web 层回退到下载目录。
         * 成功返回相册 Uri，失败返回 null。
         */
        @JavascriptInterface
        public String saveImageToGallery(String fileName, String base64Data, String mimeType) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                return null;
            }
            try {
                byte[] data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE,
                        (mimeType == null || mimeType.isEmpty()) ? "image/png" : mimeType);
                values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH,
                        Environment.DIRECTORY_PICTURES + "/班务星");
                values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1);
                Uri uri = context.getContentResolver()
                        .insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    return null;
                }
                java.io.OutputStream os = context.getContentResolver().openOutputStream(uri);
                if (os == null) {
                    context.getContentResolver().delete(uri, null, null);
                    return null;
                }
                try {
                    os.write(data);
                } finally {
                    os.close();
                }
                values.clear();
                values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0);
                context.getContentResolver().update(uri, values, null, null);
                return uri.toString();
            } catch (Throwable e) {
                return null;
            }
        }

        /**
         * 应用缓存占用（字节）：应用 cache 目录 + WebView 的 HTTP/代码/GPU 缓存。
         * 只统计本桥可清理的部分，保证“显示的大小”与“清理后释放的大小”一致。
         */
        @JavascriptInterface
        public long getCacheSizeBytes() {
            long total = dirSize(context.getCacheDir());
            for (java.io.File dir : webViewCacheDirs()) {
                total += dirSize(dir);
            }
            return total;
        }

        /**
         * 清理应用缓存：WebView 资源缓存 + 上述缓存目录。
         * 不触碰 localStorage / IndexedDB（登录态与本地业务数据）。
         */
        @JavascriptInterface
        public boolean clearCache() {
            try {
                if (context instanceof android.app.Activity) {
                    ((android.app.Activity) context).runOnUiThread(() -> {
                        if (webView != null) {
                            webView.clearCache(true);
                        }
                    });
                }
                for (java.io.File dir : webViewCacheDirs()) {
                    deleteContents(dir);
                }
                deleteContents(context.getCacheDir());
                return true;
            } catch (Throwable e) {
                return false;
            }
        }

        private java.io.File[] webViewCacheDirs() {
            java.io.File filesDir = context.getFilesDir();
            java.io.File dataDir = filesDir != null ? filesDir.getParentFile() : null;
            if (dataDir == null) {
                return new java.io.File[0];
            }
            java.io.File base = new java.io.File(dataDir, "app_webview/Default");
            return new java.io.File[] {
                    new java.io.File(base, "HTTP Cache"),
                    new java.io.File(base, "Code Cache"),
                    new java.io.File(base, "GPUCache"),
            };
        }

        private static long dirSize(java.io.File dir) {
            if (dir == null || !dir.exists()) return 0;
            if (dir.isFile()) return dir.length();
            java.io.File[] children = dir.listFiles();
            if (children == null) return 0;
            long total = 0;
            for (java.io.File child : children) {
                total += dirSize(child);
            }
            return total;
        }

        private static void deleteContents(java.io.File dir) {
            if (dir == null || !dir.isDirectory()) return;
            java.io.File[] children = dir.listFiles();
            if (children == null) return;
            for (java.io.File child : children) {
                if (child.isDirectory()) {
                    deleteContents(child);
                }
                // 删除失败（文件被 WebView 占用）时忽略，由系统后续回收
                child.delete();
            }
        }
    }
}
