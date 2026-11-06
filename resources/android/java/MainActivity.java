package __APPID__;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HorizonPermsPlugin.class);
        super.onCreate(savedInstanceState);

        // V1.8.0: let the WebView start audio without a fresh tap. Read-aloud with the Piper voice plays
        // seconds after the tap that asked for it, and Android refuses that unless this is false.
        try {
            WebView media = getBridge() != null ? getBridge().getWebView() : null;
            if (media != null) media.getSettings().setMediaPlaybackRequiresUserGesture(false);
        } catch (Exception ignored) {
            // the JS side falls back to other audio paths
        }

        // Back never closes Horizon: it steps back through panels, then sends the app to the
        // background (instead of destroying the activity, which restarts the app next time).
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv != null && wv.canGoBack()) {
                    wv.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // Let a reply that is still being fetched finish while the app is in the background.
        try {
            WebView wv = getBridge() != null ? getBridge().getWebView() : null;
            if (wv != null) wv.resumeTimers();
        } catch (Exception ignored) {
            // nothing to do
        }
    }
}
