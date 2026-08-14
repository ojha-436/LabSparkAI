/// The base URL where the R3F 3D lab web app is deployed.
///
/// Override at run time with
/// `flutter run --dart-define=LABSPARK_LAB_HOST=https://your-app.web.app`.
///
/// Empty string means "not yet deployed" — the LabRunner screen will show
/// a friendly "coming soon" state instead of a blank WebView.
const kLabHost = String.fromEnvironment(
  'LABSPARK_LAB_HOST',
  defaultValue: 'https://gen-lang-client-0686614374.web.app',
);

/// Build the URL that a specific lab id should load inside the WebView.
/// A time-bucketed `v=` param is appended so WebView doesn't serve a
/// stale cached bundle after a `firebase deploy --only hosting`.
String labUrl(String labId) {
  if (kLabHost.isEmpty) return '';
  final base = kLabHost.endsWith('/')
      ? kLabHost.substring(0, kLabHost.length - 1)
      : kLabHost;
  final now = DateTime.now();
  final bucket = '${now.year}${now.month}${now.day}${now.hour}';
  return '$base/?embed=1&labId=$labId&hideChrome=1&v=$bucket';
}

bool get labHostConfigured => kLabHost.isNotEmpty;
