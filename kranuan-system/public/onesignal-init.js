// onesignal-init.js
// ไฟล์เดียวสำหรับข้อ 5 (Add code to site)
// วิธีใช้: ใส่บรรทัดนี้ใน <head> ของทุกหน้า
//   <script src="/onesignal-init.js"></script>

(function () {
  // โหลด OneSignal SDK
  var sdk = document.createElement("script");
  sdk.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  sdk.defer = true;
  document.head.appendChild(sdk);

  // เริ่มต้นการทำงานของ OneSignal
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({
      appId: "8841f5f9-0ead-4d63-89d0-68d656f180f5",
      safari_web_id: "web.onesignal.auto.2c31ff0c-1624-4aec-8f89-a4f0b1da0ea1",
      notifyButton: {
        enable: true,
      },
    });
  });
})();
