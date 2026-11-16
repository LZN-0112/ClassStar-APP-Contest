package com.banwuxing.app;

import android.content.Context;

import cn.jpush.android.api.NotificationMessage;
import cn.jpush.android.service.JPushMessageReceiver;

/**
 * 极光推送事件接收器（与 jpush-phonegap-plugin 自带接收器并存，只做加法）。
 * 只关心「用户点击通知」事件：把 extras 交给 MainActivity，由 Web 层跳转到对应页面。
 */
public class PushMessageReceiver extends JPushMessageReceiver {

    @Override
    public void onNotifyMessageOpened(Context context, NotificationMessage message) {
        super.onNotifyMessageOpened(context, message);
        if (message != null) {
            MainActivity.onPushNotificationOpened(context, message.notificationExtras);
        }
    }
}