/// The base URL where the R3F 3D lab web app is deployed.
///
/// IMPORTANT: The Firebase project has TWO hosting sites:
///   • gen-lang-client-0686614374.web.app  (default — stale, OLD code)
///   • labspark-app.web.app                (target: app — CURRENT code)
///
/// `firebase deploy --only hosting` targets `labspark-app.web.app` per
/// firebase.json + .firebaserc. So the Flutter WebView must point HERE,
/// otherwise the phone loads the pre-embed-mode bundle and every lab
/// renders as a blank white area.
///
/// Override at run time with
/// `flutter run --dart-define=LABSPARK_LAB_HOST=https://your-app.web.app`.
const kLabHost = String.fromEnvironment(
  'LABSPARK_LAB_HOST',
  defaultValue: 'https://labspark-app.web.app',
);

/// Build the URL that a specific lab id should load inside the WebView.
/// A minute-bucketed `v=` param is appended so WebView doesn't serve a
/// stale cached bundle after a `firebase deploy --only hosting` — bucket
/// switches every minute, guaranteeing a fresh URL within a session
/// following a redeploy.
String labUrl(String labId) {
  if (kLabHost.isEmpty) return '';
  final base = kLabHost.endsWith('/')
      ? kLabHost.substring(0, kLabHost.length - 1)
      : kLabHost;
  final now = DateTime.now();
  final bucket =
      '${now.year}${now.month}${now.day}${now.hour}${now.minute}';
  return '$base/?embed=1&labId=$labId&hideChrome=1&v=$bucket';
}

bool get labHostConfigured => kLabHost.isNotEmpty;
