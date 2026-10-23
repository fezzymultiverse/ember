package com.fezzy.ember

import android.os.Bundle
import com.getcapacitor.BridgeActivity

// This is a REPLACEMENT GUESS at Capacitor 6's default template, built from your
// capacitor.config.json appId (com.fezzy.ember). Your real android/.../MainActivity.kt
// or .java was never in my hands — if it has other code in it, MERGE these two lines
// in instead of overwriting:
//   1. registerPlugin(EmberMediaPlugin::class.java)
//   2. registerPlugin(EmberNotifyPlugin::class.java)
//   3. the onCreate / onNewIntent body below, which reads a backgrounded reply and
//      pushes it into the WebView as a window event.
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(EmberMediaPlugin::class.java)
        registerPlugin(EmberNotifyPlugin::class.java)
        super.onCreate(savedInstanceState)
        handleBgReply(intent)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        handleBgReply(intent)
    }

    private fun handleBgReply(intent: android.content.Intent?) {
        val text = intent?.getStringExtra("ember_bg_reply") ?: return
        val js = "window.dispatchEvent(new CustomEvent('ember-bg-reply', {detail:" +
            org.json.JSONObject.quote(text) + "}));"
        bridge?.webView?.post { bridge.webView.evaluateJavascript(js, null) }
    }
}
