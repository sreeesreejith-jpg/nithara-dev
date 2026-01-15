# APK Signing and Seamless Updates Documentation

## Overview
This document explains the setup that allows the Nithara Android application to be updated on user devices without requiring the uninstallation of the previous version.

## The Concept: Digital Signatures
Android uses digital signatures to verify the identity of an application's author.
- **Before**: If you build an app on different machines or without a specific key, Android Studio uses a default "debug" key. This key is often temporary or specific to one machine. If you try to update an app signed with "Key A" using an APK signed with "Key B", Android rejects it to prevent security risks.
- **Now**: We are signing the APK with a consistent, private **Keystore** (`nithara-release.keystore`) every single time.
- **Result**: Since the signature matches the one already installed on your phone, Android recognizes the update as valid and allows it to proceed while keeping all your app data intact.

## Implementation Details

### 1. Android Build Configuration (`android/app/build.gradle`)
We configured the Android build system to use a specific release key and load credentials from environment variables.

```gradle
android {
    // ...
    signingConfigs {
        release {
            // Looks for the keystore file in the app directory
            storeFile file("nithara-release.keystore")
            // Reads sensitive passwords from Environment Variables (set by GitHub Actions)
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            // Apply the release signing config defined above
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2. GitHub Actions Workflow (`.github/workflows/android-build.yml`)
The automation server (GitHub Actions) doesn't have the file physically. We reconstruct it from a secure secret during the build.

**Step 1: Decode the Keystore**
We converted the binary keystore file into a Base64 text string and stored it as a separate secret (`KEYSTORE_BASE64`). This step turns it back into a file.

```yaml
- name: Decode Keystore
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/nithara-release.keystore
```

**Step 2: Build with Secrets**
We pass the passwords securely to the build command.

```yaml
- name: Build Signed APK
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  run: |
    cd android
    chmod +x gradlew
    ./gradlew assembleRelease
```

## Setup for Future Reference

If you need to set this up again for a new app:

1.  **Generate a Upload Key / Keystore**:
    Run this command in your terminal (keep the file and passwords safe!):
    ```bash
    keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
    ```

2.  **Encode Keystore for GitHub**:
    Convert the file to a string to put in GitHub Secrets:
    ```bash
    base64 -w 0 my-release-key.keystore > keystore_base64.txt
    ```
    *(Copy the content of `keystore_base64.txt` to a secret named `KEYSTORE_BASE64`)*

3.  **Set GitHub Secrets**:
    Go to `Settings -> Secrets and variables -> Actions` in your GitHub repository and add:
    -   `KEYSTORE_BASE64`: (The long string from step 2)
    -   `KEYSTORE_PASSWORD`: (Password you chose)
    -   `KEY_ALIAS`: (Alias you chose, e.g., `my-key-alias`)
    -   `KEY_PASSWORD`: (Password for the key alias)
