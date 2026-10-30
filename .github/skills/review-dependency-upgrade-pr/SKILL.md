---
name: review-dependency-upgrade-pr
description: Review dependency upgrade PRs (Dependabot/Renovate/manual) for this repo, including example app Expo/React Native version configs. Use when asked to review, vet, or update a dependency bump PR.
---

# Reviewing dependency upgrade PRs

## 1. Scope the change
- `gh pr view <n> --json title,body,files` and `gh pr diff <n>`.
- Classify: root `package.json` (library, peer deps), `example/package.json`, `example/version-configs.json`, lockfile only, native (`android/`, `ios/`, podspec, `nitro.json`).
- Flag major bumps, peer-dependency range changes, and bumps of `react-native`, `react-native-vision-camera`, `react-native-nitro-modules`, `nitrogen`, `expo`.
- Verify the lockfile change matches the manifest change (no unrelated packages updated, no registry URL changes).

## 2. Read release notes
For each notable bump, read the changelog/release notes between versions for breaking changes, minimum RN/iOS/Android versions, and deprecations affecting `src/`, `ios/`, `android/`.

## 3. Verify locally (from repo root)
```bash
yarn install
yarn typecheck
yarn lint
yarn test
yarn prepare   # bob build; confirm nitrogen/generated has no unexpected diff
```

## 4. Example app version configs (`example/version-configs.json`)
Configs: `expo-54`, `next`, `latest`. Keep `managedPackages` consistent with the dependencies in each config.

To refresh `latest`:
1. Look up newest stable: `npm view <pkg> dist-tags.latest` for `expo`, `react`, `@types/react`, `react-native`, `babel-preset-expo`. Write them in `latest` (`~` for expo packages and `@types/react`, exact for react/react-native).
2. From `example/`: `yarn use:latest` (installs the config), then `yarn check-expo`.
3. Set the versions `check-expo` recommends (expo-* packages, react, react-native-safe-area-context, react-native-worklets, typescript, etc.) in `latest`.
4. If `check-expo` flags a package not in `version-configs.json` (e.g. `@babel/core`), fix it too: add it to `devDependencies` (or `dependencies`) of every configuration with the recommended version, and add it to `managedPackages` so switching configs doesn't leave a stale or removed copy.
5. Re-run `yarn use:latest` and `yarn check-expo` until it reports "Dependencies are up to date".
6. Expo's recommended `react` may be lower than npm latest; Expo's recommendation wins.

## 5. Native/runtime checks (when RN/Expo/vision-camera changes)
- From `example/`: `yarn test-version:ios:latest` and `yarn test-version:android:latest` if feasible; otherwise state they were not run.
- Confirm OCR scanning, photo recognition, and translation still work.

## 6. Report
Summarize: packages bumped (old → new), breaking changes found, commands run and results, anything unverified, and a verdict (approve / request changes) with specific follow-ups. Update `CHANGELOG.md` / `MIGRATION.md` if supported versions change.
