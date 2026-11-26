# Releasing

`npm run dist:mac` builds `release/OpenSpindle-<version>-universal.dmg`, and the `-universal-mac.zip` that installed apps update from: one app for Apple silicon and Intel, signed with a Developer ID Application certificate, notarized by Apple and stapled, so it opens on any Mac without a Gatekeeper warning. `npm run package:mac` is the quick build for this Mac only: an ad-hoc signed `release/mac*/OpenSpindle.app`, not notarized.

`npm run dist:win` builds `release/OpenSpindle-Setup-<version>.exe`, the Windows installer, for x64, which Windows on Arm runs emulated. It installs OpenSpindle for the user who runs it, in `%LOCALAPPDATA%\Programs\openspindle`, without administrator rights, and installed apps update from it. It is not signed yet ([Signing on Windows](#signing-on-windows)). `npm run package:win` builds the same without reading `.env`; both run on macOS as well as on Windows.

Packaged apps keep only Electron's English resources (`electronLanguages` in [electron-builder.yml](../electron-builder.yml): `en` on macOS, `en-US` on Windows, which names them by region), as the interface is English: without Chromium's other translations the app is 50 MB smaller, and whatever the computer's language, Chromium's locale is en-US (times and numbers the app formats with the default locale look as they do in the US) and macOS's own dialogs are in English.

## Versions

Versions follow semantic versioning and are derived from the titles of the merged pull requests, on `main`: a `feat` since the last tag makes a minor version, a `fix` a patch, a breaking change (`!` before the colon) a major one. Nothing else counts — a run that merges `docs`, `ci`, `chore` and the rest alone releases nothing. [release.yml](../.github/workflows/release.yml) computes it with [git-cliff](https://git-cliff.org/) from [cliff.toml](../cliff.toml), writes `version` in package.json, prepends the release's section to CHANGELOG.md, commits both as `chore(release): v<version> [skip ci]`, tags that commit, and opens a draft GitHub release titled "OpenSpindle <version>" whose notes are the section ([Releasing](#releasing)).

A build uses the version as its build number (`CFBundleVersion` on macOS, the last part of the file version on Windows). The About panel on macOS shows both; dev and preview runs show package.json's version as "(dev)".

## Credits

The About panel credits the open-source software the app includes, with the license texts. Every production build (`npm run build`, `start`, and the `package` and `dist` scripts) records the npm packages each bundle contains, their licenses and copyright notices in `build/third-party-notices.json` ([tools/vite/third-party.ts](../tools/vite/third-party.ts)), together with Electron and the stylesheets Tailwind compiles in; commit the file when it changes, as dev runs read it. Packaged apps carry it among their resources (`Contents/Resources` on macOS, `resources` beside `OpenSpindle.exe` on Windows), with Electron's license and `LICENSES.chromium.txt` for the Chromium, Node.js and other software Electron includes. electron-builder writes that file after packing ([tools/packaging/chromium-licenses.ts](../tools/packaging/chromium-licenses.ts)) from Electron's `LICENSES.chromium.html`, which repeats the same license texts for hundreds of components: every component keeps its homepage, copyright notices and license, and a passage that recurs is printed once and cited as `[Text N]`, 1.5 MB instead of 20 MB. The build fails if any component's text could not be rebuilt from the file. Both license files come with Electron's binary, which the electron package downloads only when something first runs it, not on `npm ci`: the `package` and `dist` scripts download it first when it is missing. That is the binary for the computer that builds, so a Windows installer built on a Mac carries the Mac's Electron licenses, which list nearly the same components; releases build each app on its own system. On Windows, whose About panel is a message box too small for the credits, **Help › Open-Source Licenses** opens them as a text file ([about.ts](../electron/main/about.ts)). A package whose license files lack its copyright notice gets one in the tool's `ATTRIBUTIONS`, as occt-import-js does; a package that publishes no license text at all gets the standard text of the license its package.json names, in `LICENSE_TEXTS`, as lazy-val (electron-updater's) does.

## Releasing

`main` is the trunk: every change reaches it as a squash-merged pull request that passed CI, and every release is cut from it. [ci.yml](../.github/workflows/ci.yml) runs `npm ci`, the typecheck, lint, Prettier check and build on every pull request and every push to `main`, and fails when the build changes the committed `build/third-party-notices.json`; [pr-title.yml](../.github/workflows/pr-title.yml) checks that a pull request's title is a Conventional Commit. **Run workflow** on the CI workflow packages the app on the repository's macOS runner for any branch, for testers ([Trying a build](#trying-a-build)).

Merging into `main` starts the version and its notes; the built apps are added on the Mac:

1. **Version, notes, tag and draft** come from the merge itself: [release.yml](../.github/workflows/release.yml) runs on every push to `main`, takes the commits since the last tag that the rules above count, and, when there is at least one, writes the version and CHANGELOG.md, tags the commit and opens the draft release. When nothing counts, it says so and stops. Nothing to do by hand, and never write `version` or CHANGELOG.md in a pull request.
2. Build the app from that tag with `npm run dist:mac` ([Releasing from a Mac](#releasing-from-a-mac)). It signs and notarizes the universal app and writes the DMG, the zip, their blockmaps and `latest-mac.yml` in `release/`.
3. Attach them to the draft: `gh release upload v<version> release/*.dmg release/*.zip release/*.blockmap release/latest-mac.yml`.
4. Publish the draft as the latest release: `gh release edit v<version> --draft=false --latest`.

Installed apps see a release only once it is published, with everything attached. If a build fails, fix the cause and rebuild from the same tag; the draft stays unpublished until its files are attached. Published releases are immutable: to replace one, delete the release and its tag (`gh release delete v<version> --cleanup-tag`); the next merge then releases that code again under the next version, and a fix merged for it carries the version forward.

## Trying a build

**Run workflow** on the CI workflow builds the universal app from any branch (`npm run package:mac -- --universal`) and links the zip from the run's summary for 14 days: the run's **Summary**. Downloading it needs a GitHub account. It is the code the branch would ship, so testers can try it before it is released, but it is ad-hoc signed and not notarized:

- macOS blocks its first launch: open it once, then choose **Open Anyway** in System Settings → Privacy & Security.
- Quit an installed OpenSpindle first: the build uses the same data folder, and only one runs at a time.
- It does not update itself ([Updates](#updates)); install the release once it is published.

## Setting up the repository

Once, when the repository is created on GitHub (`OWNER/REPO` below), with the GitHub CLI and admin rights on the repository:

1. Squash merging only, with the pull request's title and description as the commit message, and merged branches deleted:

   ```sh
   gh repo edit OWNER/REPO --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge
   gh api -X PATCH repos/OWNER/REPO -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
   ```

2. The ruleset protecting `main`, [.github/rulesets/main.json](../.github/rulesets/main.json): no force pushes or deletion, linear history, and changes only through squash-merged pull requests whose conversations are resolved and whose Checks and PR title checks pass. Repository admins can bypass it when merging a pull request, never by pushing. After a change to the file, `gh api -X PUT repos/OWNER/REPO/rulesets/<id> --input .github/rulesets/main.json` updates it (`gh api repos/OWNER/REPO/rulesets` lists the ids).

   ```sh
   gh api -X POST repos/OWNER/REPO/rulesets --input .github/rulesets/main.json
   ```

3. Immutable releases, so that nobody can change a published release's files or move its tag: `gh api -X PUT repos/OWNER/REPO/immutable-releases`.
4. Under Settings → Actions → General, **Require actions to be pinned to a full-length commit SHA**. The workflows pin every action, and Dependabot ([dependabot.yml](../.github/dependabot.yml)) proposes new pins and npm updates monthly.
5. Private vulnerability reporting, which [SECURITY.md](../SECURITY.md) points reporters to: `gh api -X PUT repos/OWNER/REPO/private-vulnerability-reporting`.

Every job runs on the repository's own runners, never on GitHub-hosted ones: `arc-runner-openspindle`, a runner of the project's Kubernetes Actions runner controller, and `openspindle-macos`, an Apple Silicon Mac registered at repository scope. The Mac needs the GitHub CLI (`brew install gh`) and Xcode's command line tools, and must stay awake on AC power (`sudo pmset -c sleep 0`) or CI packaging runs queue.

## Updates

Packaged apps update themselves from this repository's GitHub releases ([updates.ts](../electron/main/updates.ts), with electron-updater), so the repository has to be public: installed apps read its releases without credentials. Releases ship the Mac app only: a Windows app, installed from an earlier release or from a local build, finds no `latest.yml` here and never updates itself. When it builds the DMG and zip, or the Windows installer, electron-builder writes the feed, `latest-mac.yml` or `latest.yml`, beside them, and `app-update.yml`, which names the repository in package.json, into the app. `npm run package:mac` builds have no DMG or zip and so neither file: their apps cannot update and, like a dev run, say so under **Check for Updates…**.

An app checks ten seconds after launch and every four hours, downloads a newer release's zip, or on Windows its installer, in the background and installs it when it quits. A notification says when an update is ready; clicking it, or **Restart to Install Update…** in the OpenSpindle menu (the Help menu on Windows), shows the release notes with **Restart Now**, **Later** and **Release Notes** (the release's page). **Check for Updates…** checks at once and says what it found. Restarting asks the same questions as quitting (a running job, unsaved changes), so an update never interrupts a job; when declined, it installs at the next quit.

The release notes are the GitHub release's notes, copied from the release's section of CHANGELOG.md: the titles of the `feat`, `fix`, `perf` and `revert` pull requests merged since the previous release, under Features, Bug Fixes, Performance and Reverts, so titles should read well to people using the app. The update dialog shows their first lines as text. macOS (Squirrel.Mac) accepts only an update signed by the same team, and replaces only an app that can be replaced: run from /Applications, not from the DMG. On Windows the installer runs without showing itself; electron-updater checks an update's signature only against a publisher named in `app-update.yml`, which unsigned builds leave out.

## Signing on Windows

Releases ship the Mac app only; this section is about a Windows installer built and distributed yourself. The Windows installer is not signed yet, so SmartScreen warns before it runs ("Windows protected your PC") until the user chooses **More info**, then **Run anyway**. It is to be signed through [SignPath Foundation](https://signpath.org), which signs open-source projects' releases for free with its own certificate: Windows then names SignPath Foundation as the publisher. The foundation signs only what a project already releases, so the first Windows releases ship unsigned. Its [terms](https://signpath.org/terms) also ask for a code signing policy on the project's site, naming who writes, reviews and approves releases ([CODE_SIGNING.md](CODE_SIGNING.md)), multi-factor sign-in for everyone on the team, and a person's approval of every signing request.

## Releasing from a Mac

This needs the Developer ID Application certificate in the login keychain (only the team's Account Holder can create one: Xcode → Settings → Accounts → Manage Certificates → + → Developer ID Application) and a notarytool keychain profile, made once with `xcrun notarytool store-credentials openspindle-notary --apple-id <Apple ID> --team-id <team id>` and an app-specific password from account.apple.com.

Copy `.env.example` to `.env`, which git ignores, and set `CSC_NAME` to the certificate's name without "Developer ID Application: " and `APPLE_KEYCHAIN_PROFILE` to the profile. `npm run dist:mac` reads it; variables already set in the shell win. The first signing asks whether `codesign` may use the certificate's key: **Always Allow** saves a prompt per file. `spctl --assess -vv release/mac-universal/OpenSpindle.app` reports `source=Notarized Developer ID` for a good build. The build writes the DMG, the zip, their blockmaps and `latest-mac.yml` in `release/`, ready to attach to the GitHub release ([Releasing](#releasing)).

## Error reports

Apps report errors to Sentry ([architecture.md](architecture.md#errors-and-logs)) when they were built with its DSN, `SENTRY_DSN`, which says where reports go and is not a secret. Every build takes it from the environment or `.env` (dev runs too: their reports say `development`, releases `production`), and a build without one reports nothing. Reports name the release `openspindle@<version>`.

Release builds also upload their source maps, so that reports show the source rather than the minified bundles, and then delete them: the app ships without them. That takes a Sentry auth token, `SENTRY_AUTH_TOKEN` (an organization token, from Sentry's Settings → Auth Tokens), with `SENTRY_ORG` and `SENTRY_PROJECT`, the organization's and the project's slugs. A build uploads only when the token is in its environment: `npm run dist:mac` reads it from `.env`, and `npm run build` and dev runs never upload. A failed upload does not stop the build; its reports show minified code.

## What signing and notarization do

- Signing, on this Mac, proves the app comes from the certificate's team and has not changed since. The app runs with the hardened runtime and electron-builder's default entitlements: `allow-jit` and `allow-unsigned-executable-memory` for V8 and WebAssembly, and `disable-library-validation` as provided by Electron's default entitlements.
- Before signing, electron-builder flips Electron's fuses (`electronFuses` in [electron-builder.yml](../electron-builder.yml)), so the signature covers them. The packaged app loads only its own `app.asar` and checks it against the hash in its Info.plist, and it ignores `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, `--inspect` and `SIGUSR1`: nobody can run their own Node.js code inside the signed app. `npx @electron/fuses read --app <path to OpenSpindle.app>` lists them. Development runs use Electron from node_modules, which keeps all of them.
- Notarization uploads a zip of the signed app to Apple's notary service, which checks it for malware and signing problems and issues a ticket for those exact files; electron-builder staples the ticket to the app, so Gatekeeper accepts it offline. It is automated, not App Review, and takes a few minutes. A signed app that is not notarized is blocked on other Macs like an unsigned one.
- The DMG itself is not signed (electron-builder's default): the stapled app inside it carries the notarization.
- Without a signing certificate the build fails (`forceCodeSigning`). Without notarization credentials electron-builder only warns and skips notarization, so check the built app with `spctl --assess -vv release/mac-universal/OpenSpindle.app` before attaching it.
- electron-builder 26 keeps signing options directly under `mac` and takes `APPLE_API_KEY` as a file path; version 27 moves the options under `mac.sign` and takes the key's contents, base64-encoded.
