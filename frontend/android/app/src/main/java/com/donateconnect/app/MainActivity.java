package com.donateconnect.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register callback with OnBackPressedDispatcher so both hardware/system
        // Back buttons and Android edge-swipe gestures route through WebView
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                dispatchBackButtonToWebView();
            }
        });
    }

    private void dispatchBackButtonToWebView() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                "  var ev = new CustomEvent('androidBackButton', { cancelable: true });" +
                "  var prevented = !window.dispatchEvent(ev);" +
                "  return prevented;" +
                "})()",
                value -> {
                    if (!"true".equals(value)) {
                        runOnUiThread(() -> {
                            // If web application did not prevent default exit, minimize/exit to device home
                            moveTaskToBack(true);
                        });
                    }
                }
            );
            return;
        }
        moveTaskToBack(true);
    }

    @Override
    public void onBackPressed() {
        // Fallback for older Android devices or direct calls
        dispatchBackButtonToWebView();
    }
}
