function postToNative(payload) {
  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
}

var params = new URLSearchParams(window.location.search);
var modelUrl = params.get("model");
var viewer = document.getElementById("viewer");

if (!modelUrl) {
  postToNative({ type: "error", reason: "missing model param" });
} else {
  viewer.addEventListener("load", function () {
    postToNative({ type: "loaded" });
  });
  viewer.addEventListener("error", function (event) {
    postToNative({ type: "error", reason: String(event && event.detail && event.detail.type) });
  });
  viewer.src = modelUrl;
}
