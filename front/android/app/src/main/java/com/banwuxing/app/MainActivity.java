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

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onResume() {
        super.onResume();
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
