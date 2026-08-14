// LabSpark AI — Firebase configuration.
//
// Values sourced from the web project firebase-config.json:
//   projectId:  gen-lang-client-0686614374
//
// Regenerate with:
//    dart pub global activate flutterfire_cli
//    flutterfire configure --project=gen-lang-client-0686614374
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'LabSpark AI currently supports Android + iOS + Web. '
          'Platform $defaultTargetPlatform is not configured.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    appId: '1:686718900098:android:bd7fc3291150009f9de19b',
    apiKey: 'AIzaSyDk3rIhEvAq_Av9OeKr43dleXRHNty0w8k',
    projectId: 'gen-lang-client-0686614374',
    messagingSenderId: '686718900098',
    storageBucket: 'gen-lang-client-0686614374.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    appId: '1:686718900098:ios:REPLACE_AFTER_REGISTERING_IOS_APP',
    apiKey: 'AIzaSyDdZI2ID1UJ0mYJ4gW6AvfjiDBVZUjhH7c',
    projectId: 'gen-lang-client-0686614374',
    messagingSenderId: '686718900098',
    storageBucket: 'gen-lang-client-0686614374.firebasestorage.app',
    iosBundleId: 'com.labspark.ai',
  );

  static const FirebaseOptions web = FirebaseOptions(
    appId: '1:686718900098:web:6484195a7633d6c69de19b',
    apiKey: 'AIzaSyDdZI2ID1UJ0mYJ4gW6AvfjiDBVZUjhH7c',
    authDomain: 'gen-lang-client-0686614374.firebaseapp.com',
    projectId: 'gen-lang-client-0686614374',
    messagingSenderId: '686718900098',
    storageBucket: 'gen-lang-client-0686614374.firebasestorage.app',
  );
}
