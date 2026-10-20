# 公道钟馗·问道

Android/Capacitor application and Google Play purchase-entitlement service.

## Repository contents

- `app/www/`: application web assets and local MediaPipe assets.
- `app/android/`: Capacitor Android project files. Generated assets and build output are intentionally ignored.
- `app/server/`: Cloud Run entitlement verification service, tests, and deployment documentation.
- Top-level documents and media: original product materials and project notes.

## Local setup

```powershell
cd app
npm ci
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

The server has its own lockfile:

```powershell
cd app/server
npm ci
npm test
```

For a release build, copy `app/android/keystore.properties.example` to
`app/android/keystore.properties` and provide a keystore outside version control.
Cloud Run secrets and the entitlement signing private key must remain in Secret
Manager or another protected system; they are never stored in this repository.

## Deliberately excluded

The repository does not contain Android signing keys, passwords, service-account
credentials, Cloud Run secrets, dependency directories, build artifacts, or
the local `tmp/` folder containing private registration-document images.

