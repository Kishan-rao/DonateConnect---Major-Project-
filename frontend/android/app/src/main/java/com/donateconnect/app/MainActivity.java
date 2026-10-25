package com.donateconnect.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onBackPressed() {
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
                            if (getBridge().getWebView().canGoBack()) {
                                getBridge().getWebView().goBack();
                            } else {
                                moveTaskToBack(true);
                            }
                        });
                    }
                }
            );
            return;
        }
        super.onBackPressed();
    }
}
