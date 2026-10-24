package com.fezzy.ember

import android.os.Bundle
import com.getcapacitor.BridgeActivity

// This is a REPLACEMENT GUESS at Capacitor 6's default template, built from your
// capacitor.config.json appId (com.fezzy.ember). Your real android/.../MainActivity.kt
// or .java was never in my hands — if it has other code in it, MERGE these in instead of overwriting:
//   1. registerPlugin(EmberMediaPlugin::class.java)
//   2. registerPlugin(EmberNotifyPlugin::class.java)
//   2b. registerPlugin(EmberAiPlugin::class.java)   (V1.5.9, background replies)
//   2c. registerPlugin(EmberYoutubePlugin::class.java)   (V1.6.0, YouTube search + audio download)
//   3. the onCreate / onNewIntent body below, which (a) reads a backgrounded reply and pushes it into the
//      WebView as a window event, and (b) hands the com.fezzy.ember:// app link (Spotify sign-in coming back) to the WebView.
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(EmberMediaPlugin::class.java)
        registerPlugin(EmberNotifyPlugin::class.java)
        registerPlugin(EmberAiPlugin::class.java)
        registerPlugin(EmberYoutubePlugin::class.java)
        super.onCreate(savedInstanceState)
        handleBgReply(intent)
        handleLink(intent)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handleBgReply(intent)
        handleLink(intent)
    }

    private fun handleBgReply(intent: android.content.Intent?) {
        val text = intent?.getStringExtra("ember_bg_reply") ?: return
        val js = "window.dispatchEvent(new CustomEvent('ember-bg-reply', {detail:" +
            org.json.JSONObject.quote(text) + "}));"
        bridge?.webView?.post { bridge.webView.evaluateJavascript(js, null) }
    }

    // com.fezzy.ember://spotify?code=...&state=...  -> window event 'ember-deeplink' (and window.__emberDeepLink for a cold start).
    // Sent twice (now and 1.5 s later) because on a cold start the page may not have loaded the first time; the JS side ignores the repeat.
    private fun handleLink(intent: android.content.Intent?) {
        val data = intent?.data ?: return
        if (data.scheme != "com.fezzy.ember") return
        val q = org.json.JSONObject.quote(data.toString())
        val js = "window.__emberDeepLink=" + q + ";window.dispatchEvent(new CustomEvent('ember-deeplink',{detail:" + q + "}));"
        val wv = bridge?.webView ?: return
        wv.post { wv.evaluateJavascript(js, null) }
        wv.postDelayed({ wv.evaluateJavascript(js, null) }, 1500)
    }
}
