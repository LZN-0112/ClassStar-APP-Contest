package com.banwuxing.app;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tencent.mm.opensdk.modelbase.BaseResp;
import com.tencent.mm.opensdk.modelmsg.SendAuth;
import com.tencent.mm.opensdk.openapi.IWXAPI;
import com.tencent.mm.opensdk.openapi.WXAPIFactory;

/**
 * 微信登录桥接插件：Web 层调用 Wechat.login() 唤起微信授权，
 * 回调结果由 wxapi.WXEntryActivity 转交 handleAuthResp 返回给 JS。
 */
@CapacitorPlugin(name = "Wechat")
public class WechatPlugin extends Plugin {

    public static final String APP_ID = "wx097234aa12798b93";
    public static final String AUTH_STATE = "banwuxing_login";

    private static PluginCall pendingCall;

    /**
     * 合规要求：不在 App 启动时初始化第三方 SDK。
     * 微信 SDK 仅在用户主动点击「微信登录/绑定」时注册，见 {@link #login(PluginCall)}。
     */
    @PluginMethod
    public void login(PluginCall call) {
        Context context = getContext();
        IWXAPI api = WXAPIFactory.createWXAPI(context, APP_ID, true);
        api.registerApp(APP_ID);

        if (!api.isWXAppInstalled()) {
            call.reject("未安装微信，请先安装微信后再使用微信登录");
            return;
        }
        if (pendingCall != null) {
            call.reject("微信登录正在进行中，请稍候");
            return;
        }

        SendAuth.Req req = new SendAuth.Req();
        req.scope = "snsapi_userinfo";
        req.state = AUTH_STATE;

        pendingCall = call;
        if (!api.sendReq(req)) {
            pendingCall = null;
            call.reject("唤起微信失败，请稍后重试");
        }
    }

    /**
     * 由 WXEntryActivity 在微信回调时调用
     */
    public static void handleAuthResp(BaseResp resp) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) {
            return;
        }

        if (!(resp instanceof SendAuth.Resp)) {
            call.reject("微信登录失败，请重试");
            return;
        }

        SendAuth.Resp authResp = (SendAuth.Resp) resp;
        if (authResp.state != null && !AUTH_STATE.equals(authResp.state)) {
            call.reject("微信登录校验失败，请重试");
            return;
        }

        if (authResp.errCode == BaseResp.ErrCode.ERR_OK
                && authResp.code != null
                && !authResp.code.isEmpty()) {
            JSObject result = new JSObject();
            result.put("code", authResp.code);
            call.resolve(result);
        } else if (authResp.errCode == BaseResp.ErrCode.ERR_USER_CANCEL) {
            call.reject("已取消微信登录");
        } else if (authResp.errCode == BaseResp.ErrCode.ERR_AUTH_DENIED) {
            call.reject("微信授权被拒绝");
        } else {
            call.reject("微信登录失败，请重试");
        }
    }
}