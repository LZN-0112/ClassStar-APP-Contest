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

        // 启用 WebView 远程调试
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 向 Web 层暴露状态栏高度，用于 CSS 安全区变量兜底
        this.bridge.getWebView().addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

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
        AndroidBridge(android.content.Context context) { this.context = context; }

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
    }
}
