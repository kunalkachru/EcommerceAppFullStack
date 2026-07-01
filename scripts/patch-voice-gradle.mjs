#!/usr/bin/env node
/** Patch @react-native-voice/voice for Gradle 8 / RN 0.85. */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gradlePath = join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-voice",
  "voice",
  "android",
  "build.gradle"
);

const contents = `apply plugin: 'com.android.library'

repositories {
    mavenCentral()
    google()
    maven {
        url "$rootDir/../node_modules/react-native/android"
    }
}

def DEFAULT_COMPILE_SDK_VERSION = 36
def DEFAULT_TARGET_SDK_VERSION = 36

android {
    namespace "com.wenkesj.voice"
    compileSdk rootProject.hasProperty('compileSdkVersion') ? rootProject.compileSdkVersion : DEFAULT_COMPILE_SDK_VERSION

    defaultConfig {
        minSdkVersion rootProject.hasProperty('minSdkVersion') ? rootProject.minSdkVersion : 24
        targetSdkVersion rootProject.hasProperty('targetSdkVersion') ? rootProject.targetSdkVersion : DEFAULT_TARGET_SDK_VERSION
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    testImplementation 'junit:junit:4.12'
    implementation 'com.facebook.react:react-native:+'
}
`;

writeFileSync(gradlePath, contents);
console.log("Patched @react-native-voice/voice android/build.gradle");
