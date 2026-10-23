package com.fezzy.ember

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

const val EMBER_CHANNEL_ID = "ember_replies"
const val EMBER_REPLY_KEY = "ember_reply_text"

@CapacitorPlugin(
    name = "EmberNotify",
    permissions = [Permission(strings = [android.Manifest.permission.POST_NOTIFICATIONS], alias = "notify")]
)
class EmberNotifyPlugin : Plugin() {

    override fun load() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val ch = NotificationChannel(EMBER_CHANNEL_ID, "Ember replies", NotificationManager.IMPORTANCE_HIGH)
            nm.createNotificationChannel(ch)
        }
    }

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val r = JSObject()
        r.put("granted", getPermissionState("notify") == com.getcapacitor.PermissionState.GRANTED)
        call.resolve(r)
    }

    @PluginMethod
    fun requestNotifyPermission(call: PluginCall) {
        requestPermissionForAlias("notify", call, "permissionCallback")
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        hasPermission(call)
    }

    // Posts a notification with a real inline reply box (RemoteInput).
    // Typing a reply and tapping send fires ReplyReceiver, which hands the text
    // back into the WebView as a window event — no app open required.
    @PluginMethod
    fun notify(call: PluginCall) {
        if (getPermissionState("notify") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("POST_NOTIFICATIONS not granted. Call requestNotifyPermission first.")
            return
        }
        val title = call.getString("title") ?: "Ember"
        val body = call.getString("body") ?: ""
        val id = (System.currentTimeMillis() % 100000).toInt()

        val remoteInput = RemoteInput.Builder(EMBER_REPLY_KEY).setLabel("Reply to Ember").build()
        val replyIntent = Intent(context, ReplyReceiver::class.java).setAction("com.fezzy.ember.REPLY")
        replyIntent.putExtra("ember_notif_id", id)
        val replyPendingIntent = PendingIntent.getBroadcast(
            context, id, replyIntent,
            PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val replyAction = NotificationCompat.Action.Builder(
            android.R.drawable.ic_menu_send, "Reply", replyPendingIntent
        ).addRemoteInput(remoteInput).setAllowGeneratedReplies(true).build()

        val openIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent(context, MainActivity::class.java)
        val openPending = PendingIntent.getActivity(
            context, id, openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val n = NotificationCompat.Builder(context, EMBER_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(openPending)
            .addAction(replyAction)
            .setAutoCancel(true)
            .build()

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(id, n)
        call.resolve()
    }
}
