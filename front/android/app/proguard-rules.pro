# Capacitor / WebView 反射调用保留规则
# R8 会移除仅被 WebView 通过反射调用的类与方法，必须显式保留

-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor 桥接与插件基类
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * {
    public *;
}

# JS 注入接口（WebView addJavascriptInterface）
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova 插件兼容层
-keep class org.apache.cordova.** { *; }

# 主 Activity
-keep class com.banwuxing.app.** { *; }

# 微信开放平台 SDK（含回调 Activity 与反射调用的模型类）
-keep class com.tencent.mm.opensdk.** { *; }
-keep class com.tencent.wxop.** { *; }
-keep class com.tencent.mm.sdk.** { *; }

# 保留 Parcelable / 枚举序列化字段
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}
