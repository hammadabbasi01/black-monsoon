# Black Monsoon

Story-driven military shooter. Act 1 follows Sgt. Rahim "Falcon" Durrani of Task Force Ember.

- `web/` holds the game. `npm install && npm run build` inside `web/` produces `web/dist/`.
- Every push to `main` runs `.github/workflows/android-apk.yml`, which builds an Android APK and attaches it to a GitHub Release.

Act 1 status: M1 Quiet Harbor playable. M2 Deep Water, M3 Ghost Ridge and M4 Monsoon Gate come next.

## Unity version (`unity/`)

A Unity 2022.3 project of the same Act 1 Mission 1. The level, squad and mission are built from C# at runtime (`Assets/Scripts`), and `Assets/Editor/BuildScript.cs` creates the scene and builds the APK.

`.github/workflows/unity-apk.yml` builds it on GitHub once these repository secrets exist (Settings > Secrets and variables > Actions):
- `UNITY_EMAIL`, `UNITY_PASSWORD` — a free Unity account
- `UNITY_LICENSE` — contents of the `.ulf` file from activating Unity Personal once in Unity Hub (see https://game.ci/docs/github/activation)
