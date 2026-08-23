# ── Agora RTC / Conversational AI ──────────────────────────────────────
# `minifyEnabled true` + `shrinkResources true` are on for the release
# build. Without these keeps, R8 strips the Agora native JNI bridge and
# the app crashes the moment a voice session starts — in RELEASE ONLY,
# which is exactly when you find out during a demo. Do not remove.
-keep class io.agora.**{ *; }
-dontwarn io.agora.**

# ── Flutter / plugins already in the app ───────────────────────────────
-dontwarn io.flutter.embedding.**
