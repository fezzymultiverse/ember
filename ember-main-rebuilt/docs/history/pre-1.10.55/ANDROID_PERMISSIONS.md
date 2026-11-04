# Android bridge and permissions — 1.10.17 source audit

This is a static audit plus local patcher-fixture test, not an Android compilation or device test. No complete `android/` Gradle project was supplied. All six custom plugins have `registerPlugin(...)` calls in the supplied `MainActivity.kt` and matching JavaScript references. Workers, sessions, services and receivers are dependencies, not Capacitor plugins; registering every Kotlin class as a plugin would be wrong.

| Native source | Registration / dependency | JavaScript caller evidence | UI entry point |
|---|---|---|---|
| DownloadWorker.kt | Native dependency: EmberYoutubePlugin.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| EmberAiPlugin.kt | MainActivity.registerPlugin(EmberAiPlugin); bridge EmberAi | ember_native.js | Chat / Settings → Permissions |
| EmberAiWorker.kt | Native dependency: EmberAiPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberDevicePlugin.kt | MainActivity.registerPlugin(EmberDevicePlugin); bridge EmberDevice | ember_native.js, ember_device.js | Settings → Device Tools / Permissions |
| EmberKeepAliveService.kt | Native dependency: EmberNotifyPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberMediaPlugin.kt | MainActivity.registerPlugin(EmberMediaPlugin); bridge EmberMedia | ai_agent.js, ember_mediaplus.js, ember_native.js, ember_v104.js, ember_keyless.js, app.js, ember_features.js, ember_plus.js, ember_media.js | Music & Tools / chat download |
| EmberMediaSession.kt | Native dependency: EmberMediaPlugin.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| EmberNotifyPlugin.kt | MainActivity.registerPlugin(EmberNotifyPlugin); bridge EmberNotify | ember_native.js | Chat / Settings → Permissions |
| EmberPingWorker.kt | Native dependency: EmberNotifyPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberRouteHealth.kt | Native dependency: EmberPingWorker.kt, EmberAiWorker.kt, EmberAiPlugin.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |
| EmberWebPlugin.kt | MainActivity.registerPlugin(EmberWebPlugin); bridge EmberWeb | ember_native.js | Globe → Browser |
| EmberYoutubePlugin.kt | MainActivity.registerPlugin(EmberYoutubePlugin); bridge EmberYoutube | ai_agent.js, ember_downloads.js, app.js, ember_getmusic.js | Music & Tools / chat download |
| EmberYtCore.kt | Native dependency: EmberYoutubePlugin.kt, DownloadWorker.kt | Indirect via the registered plugin / native event bridge | Music & Tools / chat download |
| MainActivity.kt | Capacitor BridgeActivity; not a plugin | app.js (native event consumer) | Chat / Settings → Permissions |
| ReplyReceiver.kt | Native dependency: EmberNotifyPlugin.kt, EmberAiWorker.kt | Indirect via the registered plugin / native event bridge | Chat / Settings → Permissions |

## Permissions actually inserted by the patcher

| Permission | Purpose / entry point | Prompt class |
|---|---|---|
| `android.permission.INTERNET` | Remote chat, scraping, media and WebView traffic | normal |
| `android.permission.RECORD_AUDIO` | Mic / speech input | runtime |
| `android.permission.CAMERA` | Existing camera/vision file chooser | runtime/platform-dependent |
| `android.permission.MODIFY_AUDIO_SETTINGS` | Audio/microphone configuration | normal |
| `android.permission.POST_NOTIFICATIONS` | Replies, pings and media notifications | runtime on Android 13+ |
| `android.permission.READ_MEDIA_AUDIO` | Device music library | runtime on Android 13+ |
| `android.permission.READ_EXTERNAL_STORAGE` | Older device music library; maxSdkVersion=32 | runtime on older versions |
| `android.permission.FOREGROUND_SERVICE` | Foreground service base | normal |
| `android.permission.FOREGROUND_SERVICE_SPECIAL_USE` | Keep-alive service declared specialUse | normal/policy-sensitive |
| `android.permission.FOREGROUND_SERVICE_DATA_SYNC` | WorkManager download foreground service | normal |
| `android.permission.WAKE_LOCK` | Existing work / keep-awake handling | normal |
| `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | User-requested battery exemption | special settings flow |
| `android.permission.ACCESS_NETWORK_STATE` | Device network type / VPN information | normal |
| `android.permission.ACCESS_WIFI_STATE` | Device Wi-Fi information | normal |
| `android.permission.ACCESS_FINE_LOCATION` | Optional Show Wi-Fi name path | runtime; not continuous location tracking |

No contacts, SMS, call-log or accessibility permission is inserted by this patcher. The previous documentation's assertion that camera/location were not requested contradicted the code; it has been corrected. No new runtime permission was added to the patch script.

## Manifest and worker/service reconciliation

`ReplyReceiver` is declared non-exported. `EmberKeepAliveService` is non-exported with specialUse and a subtype property. `androidx.work.impl.foreground.SystemForegroundService` is merged as dataSync; WorkManager schedules `EmberAiWorker`, `EmberPingWorker` and `DownloadWorker` rather than requiring direct manifest declarations for them. The original reference additions omitted DATA_SYNC permission and the WorkManager service even though `scripts/apply_android_patch.py` already inserts both; the reference has now been synchronized, including its tools-namespace note.

Queries include com.termux, Android RecognitionService, RECOGNIZE_SPEECH and TTS_SERVICE. The patcher adds loopback-only cleartext network-security configuration for ttyd, Kotlin/WorkManager/NewPipe/OkHttp/desugaring support, icon resources and versionCode/versionName from package.json.

## Build and migration warning

Run `npm ci --legacy-peer-deps`, `npx cap add android` if needed, `npx cap sync android`, then the patch command only after reviewing the destination project. The supplied patcher deletes/replaces any MainActivity templates; do not run it blindly against a customized MainActivity. This existing destructive behavior is flagged for approval, not changed here. Kotlin API compatibility, Android 14 foreground-service policy, microphone use, battery management and real notifications remain unverified on hardware.
