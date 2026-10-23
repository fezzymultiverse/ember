package com.fezzy.ember

import android.provider.MediaStore
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

// Local (unpublished) Capacitor plugin. Registered manually in MainActivity, not via `cap sync`.
// Covers: on-device MediaStore read only. get_current_track / control_player / search_spotify /
// play_spotify / create_playlist are NOT implemented here — those need Prodigy's actual API
// (MediaSession, content provider, or whatever IPC it exposes), which this chat does not have.
@CapacitorPlugin(
    name = "EmberMedia",
    permissions = [Permission(strings = [android.Manifest.permission.READ_MEDIA_AUDIO], alias = "music")]
)
class EmberMediaPlugin : Plugin() {

    @PluginMethod
    fun hasPermission(call: PluginCall) {
        val granted = getPermissionState("music") == com.getcapacitor.PermissionState.GRANTED
        val r = JSObject()
        r.put("granted", granted)
        if (!granted) r.put("note", "READ_MEDIA_AUDIO not granted yet")
        call.resolve(r)
    }

    @PluginMethod
    fun requestMusicPermission(call: PluginCall) {
        requestPermissionForAlias("music", call, "permissionCallback")
    }

    @PermissionCallback
    private fun permissionCallback(call: PluginCall) {
        hasPermission(call)
    }

    @PluginMethod
    fun getLibrary(call: PluginCall) {
        if (getPermissionState("music") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("READ_MEDIA_AUDIO not granted. Call requestMusicPermission first.")
            return
        }
        val tracks = JSArray()
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION
        )
        val selection = MediaStore.Audio.Media.IS_MUSIC + " != 0"
        context.contentResolver.query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, projection, selection, null,
            MediaStore.Audio.Media.TITLE + " ASC"
        )?.use { c ->
            val idI = c.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val tI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val aI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
            val alI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val dI = c.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
            while (c.moveToNext()) {
                val t = JSObject()
                t.put("id", c.getLong(idI).toString())
                t.put("title", c.getString(tI) ?: "")
                t.put("artist", c.getString(aI) ?: "")
                t.put("album", c.getString(alI) ?: "")
                t.put("durationMs", c.getLong(dI))
                tracks.put(t)
            }
        }
        val r = JSObject()
        r.put("tracks", tracks)
        call.resolve(r)
    }
}
