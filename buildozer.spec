[app]
title = Random 00-99
package.name = random0099
package.domain = org.example
source.dir = .
source.include_exts = py,png,jpg,jpeg,kv,wav,mp3
version = 1.0
requirements = python3,kivy==2.3.0
orientation = portrait
fullscreen = 0

android.api = 33
android.minapi = 21
android.ndk = 25b
android.archs = arm64-v8a
android.accept_sdk_license = True

[buildozer]
log_level = 2
warn_on_root = 1
