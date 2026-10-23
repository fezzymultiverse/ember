#!/usr/bin/env python3
"""Ember V1.5.1 - apply native Android patch to a freshly generated Capacitor 6 `android/` project.

Usage: python3 scripts/apply_android_patch.py <android_dir> <android_patch_dir>
Idempotent: safe to run on every CI build. Does:
  1. Copies the Kotlin plugins in and removes the template MainActivity.java/.kt (ours replaces it).
  2. Merges permissions, <queries> (speech recogniser visibility) and the reply <receiver> into AndroidManifest.xml.
  3. Enables Kotlin in Gradle (root classpath + app plugin + jvmTarget 17).
  4. Adds a release signingConfig fed by env KEYSTORE_PASS / KEY_ALIAS / KEY_PASS and a release.keystore next to app/build.gradle.
Exits non-zero on anything it cannot verify, so CI fails loudly instead of shipping an APK without permissions.
"""
import os, re, shutil, sys, pathlib

if len(sys.argv) != 3:
    sys.exit('usage: apply_android_patch.py <android_dir> <android_patch_dir>')
A = pathlib.Path(sys.argv[1]); PATCH = pathlib.Path(sys.argv[2])
app = A / 'app'; manifest = app / 'src/main/AndroidManifest.xml'
for need in (manifest, app / 'build.gradle', A / 'build.gradle'):
    if not need.exists():
        sys.exit('missing ' + str(need) + ' - run `npx cap add android` first')

# ---------- 1. Kotlin sources ----------
pkg_dir = app / 'src/main/java/com/fezzy/ember'
pkg_dir.mkdir(parents=True, exist_ok=True)
for old in list((app / 'src/main/java').rglob('MainActivity.java')) + list((app / 'src/main/java').rglob('MainActivity.kt')):
    old.unlink()
src = PATCH / 'app/src/main/java/com/fezzy/ember'
kts = sorted(src.glob('*.kt'))
if len(kts) < 4:
    sys.exit('expected 4 Kotlin files in ' + str(src))
for f in kts:
    shutil.copy(f, pkg_dir / f.name)
print('copied', ', '.join(f.name for f in kts))

# ---------- 2. Manifest ----------
m = manifest.read_text()
perms = [
    ('android.permission.INTERNET', ''),
    ('android.permission.RECORD_AUDIO', ''),
    ('android.permission.MODIFY_AUDIO_SETTINGS', ''),
    ('android.permission.POST_NOTIFICATIONS', ''),
    ('android.permission.READ_MEDIA_AUDIO', ''),
    ('android.permission.READ_EXTERNAL_STORAGE', ' android:maxSdkVersion="32"'),
    ('android.permission.FOREGROUND_SERVICE', ''),
]
add = ''
for name, extra in perms:
    if name not in m:
        add += '    <uses-permission android:name="%s"%s />\n' % (name, extra)
if 'android.speech.RecognitionService' not in m:
    if '<queries>' in m:
        m = m.replace('<queries>', '<queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>', 1)
    else:
        add += '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n'
if add:
    i = m.index('<application')
    m = m[:i] + add.lstrip(' ') + '\n    ' + m[i:]
if '.ReplyReceiver' not in m:
    m = m.replace('</application>', '    <receiver android:name=".ReplyReceiver" android:exported="false" />\n    </application>', 1)
manifest.write_text(m)
for must in ('RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'POST_NOTIFICATIONS', 'android.speech.RecognitionService', '.ReplyReceiver', 'INTERNET'):
    if must not in manifest.read_text():
        sys.exit('manifest merge failed: ' + must)
print('manifest merged')

# ---------- 3. Kotlin in Gradle ----------
root = A / 'build.gradle'; r = root.read_text()
if 'kotlin-gradle-plugin' not in r:
    r2 = re.sub(r"(classpath\s+['\"]com\.android\.tools\.build:gradle:[^'\"]+['\"])", r"\1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'", r, count=1)
    if r2 == r:
        sys.exit('could not find AGP classpath line in android/build.gradle')
    root.write_text(r2)
g = (app / 'build.gradle'); s = g.read_text()
if "kotlin-android" not in s:
    s2 = re.sub(r"(apply plugin:\s*['\"]com\.android\.application['\"])", r"\1\napply plugin: 'kotlin-android'", s, count=1)
    if s2 == s:
        sys.exit('could not find application plugin line in app/build.gradle')
    s = s2
if 'kotlinOptions' not in s:
    s = re.sub(r"(android\s*\{)", r"\1\n    kotlinOptions { jvmTarget = '17' }", s, count=1)

# ---------- 4. Release signing ----------
if 'signingConfigs' not in s:
    block = '''
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('KEYSTORE_PASS')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASS') ?: System.getenv('KEYSTORE_PASS')
        }
    }
'''
    s2 = re.sub(r"(\n\s*buildTypes\s*\{)", block + r"\1", s, count=1)
    if s2 == s:
        sys.exit('could not find buildTypes in app/build.gradle')
    s = s2
if 'signingConfig signingConfigs.release' not in s:
    s2 = re.sub(r"(buildTypes\s*\{\s*release\s*\{)", r"\1\n            signingConfig signingConfigs.release", s, count=1)
    if s2 == s:
        sys.exit('could not find release block in buildTypes')
    s = s2
g.write_text(s)
print('gradle patched: kotlin + signing')
