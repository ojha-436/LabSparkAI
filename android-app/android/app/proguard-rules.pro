# ══ Agora RTC + RTM + Conversational AI ═════════════════════════════════
# `minifyEnabled true` + `shrinkResources true` are on for release. Without
# these keeps R8 renames or strips the JNI bridge and the app dies the moment
# a voice session starts — in RELEASE ONLY, which means you find out during a
# demo, not during development. Do not remove.

# The RTC engine and the RTM/Signaling SDK.
-keep class io.agora.** { *; }
-dontwarn io.agora.**

# The iris method channel is the Flutter <-> native bridge, and it lives under
# com.agora, NOT io.agora — so the rule above does not cover it. Renaming this
# breaks plugin registration and every Agora call with it.
-keep class com.agora.** { *; }
-dontwarn com.agora.**

# Anything reached from C++ via JNI must keep its exact name, and the native
# method declarations themselves must survive.
-keepclasseswithmembernames class * {
    native <methods>;
}

# ══ Flutter ═════════════════════════════════════════════════════════════
-dontwarn io.flutter.embedding.**
