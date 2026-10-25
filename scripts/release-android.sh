#!/usr/bin/env bash
# สร้าง APK แบบ release (เซ็นด้วยกุญแจใน android/keystore.properties) แล้วแนบกับ GitHub Release ของเวอร์ชันปัจจุบัน
# แอปในมือถือเช็ก release ล่าสุดแล้วให้กดดาวน์โหลดอัปเดตได้เอง ไม่ต้องเสียบสาย
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null || { echo "ยังไม่มี tag $TAG — commit + tag ก่อน"; exit 1; }
[ -f android/keystore.properties ] || { echo "ไม่พบ android/keystore.properties (กุญแจเซ็นแอป)"; exit 1; }

npx vite build
npx cap sync android
(cd android && ./gradlew assembleRelease)

mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk release/exercise-plan.apk
# ชื่อไฟล์คงที่ → ลิงก์ .../releases/latest/download/exercise-plan.apk ชี้เวอร์ชันล่าสุดเสมอ
NOTES=$(awk -v v="## $VERSION " 'index($0, v) == 1 { f = 1; next } /^## / { f = 0 } f' CHANGELOG.md)
if gh release view "$TAG" >/dev/null 2>&1; then
  gh release upload "$TAG" release/exercise-plan.apk --clobber
else
  gh release create "$TAG" release/exercise-plan.apk --title "$TAG" --notes "${NOTES:-$TAG}"
fi
echo "เผยแพร่ $TAG แล้ว"
