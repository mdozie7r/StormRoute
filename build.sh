#!/bin/bash
# Build and sign StormRoute.apk with the Android SDK command-line tools.
# Needs: ANDROID_HOME set (with build-tools and platforms/android-34 installed), a JDK, zip.
# Signing: put your keystore at ./stormroute.jks (alias "stormroute"), or set KS / KS_PASS.
set -euo pipefail
SDK=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
BT=$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)
AJAR="$SDK/platforms/android-34/android.jar"
[ -f "$AJAR" ] || AJAR=$(ls -d "$SDK"/platforms/android-*/android.jar | sort -V | tail -1)
KS=${KS:-stormroute.jks}; KS_PASS=${KS_PASS:-stormroute}
VC=${VC:-1}; VN=${VN:-1.0}

rm -rf build && mkdir -p build/gen build/classes build/dex
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/unsigned.apk -I "$AJAR" --manifest AndroidManifest.xml -A assets \
  --java build/gen --min-sdk-version 29 --target-sdk-version 34 --version-code "$VC" --version-name "$VN" build/res.zip
javac -nowarn -source 8 -target 8 -bootclasspath "$AJAR" -d build/classes $(find src build/gen -name '*.java')
"$BT/d8" --min-api 29 --lib "$AJAR" --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$KS_PASS" --ks-key-alias stormroute --out build/StormRoute.apk build/aligned.apk
"$BT/apksigner" verify build/StormRoute.apk && echo "Built build/StormRoute.apk"
