package com.fezzy.ember

import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.search.SearchInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem

// V1.6.0: YouTube search + audio download for www/ai_agent.js. Uses NewPipe Extractor (no Google API key).
@CapacitorPlugin(name = "EmberYoutube")
class EmberYoutubePlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val ytUrl = Regex("^https://(www\\.|m\\.|music\\.)?(youtube\\.com|youtu\\.be)/\\S+$")

    @PluginMethod
    fun search(call: PluginCall) {
        val q = call.getString("query")?.trim().orEmpty()
        if (q.isEmpty()) { call.reject("query required"); return }
        val limit = (call.getInt("limit") ?: 5).coerceIn(1, 10)
        scope.launch {
            try {
                EmberYtCore.ensure()
                // same call chain as Prodigy Syncing's YtFetch.search (known to compile against NewPipe 0.26.x)
                val qh = ServiceList.YouTube.searchQHFactory.fromQuery(q, listOf("videos"), "")
                val si = SearchInfo.getInfo(ServiceList.YouTube, qh)
                val arr = JSArray()
                for (it in si.relatedItems.filterIsInstance<StreamInfoItem>().take(limit)) {
                    arr.put(JSObject().put("title", it.name).put("url", it.url)
                        .put("channel", it.uploaderName ?: "").put("durationSec", it.duration))
                }
                call.resolve(JSObject().put("results", arr))
            } catch (e: Exception) {
                call.reject(e.message ?: "YouTube search failed")
            }
        }
    }

    @PluginMethod
    fun downloadVideo(call: PluginCall) {
        val url = call.getString("url")?.trim().orEmpty()
        if (!ytUrl.matches(url)) { call.reject("A youtube.com or youtu.be link is required"); return }
        val data = Data.Builder().putString("url", url).putString("title", call.getString("title") ?: "").build()
        val req = OneTimeWorkRequestBuilder<DownloadWorker>().setInputData(data).build()
        WorkManager.getInstance(context).enqueue(req)
        call.resolve(JSObject().put("jobId", req.id.toString()))
    }

    // What the last finished download did (kept in app-private SharedPreferences by the worker).
    @PluginMethod
    fun status(call: PluginCall) {
        val p = context.getSharedPreferences("ember_yt", android.content.Context.MODE_PRIVATE)
        call.resolve(JSObject().put("state", p.getString("state", "") ?: "").put("title", p.getString("title", "") ?: "")
            .put("detail", p.getString("detail", "") ?: "").put("at", p.getLong("at", 0L)))
    }
}
