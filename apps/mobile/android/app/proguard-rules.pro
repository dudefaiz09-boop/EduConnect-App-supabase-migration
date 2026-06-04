# React Native and Hermes release shrinker rules.
# Keep native bridge classes and JS interface entry points available after R8.

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.yoga.** { *; }

-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

-keepclasseswithmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn com.facebook.jni.**
-dontwarn com.facebook.soloader.**
