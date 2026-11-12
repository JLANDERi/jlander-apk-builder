# apk-builder

Build engine for JLANDER Web2APK. Do not edit by hand.

- `.github/workflows/build.yml` compiles one APK per job.
- `tools/generate.js` turns `job/config.json` + `job/icons.zip` into an Android project.

The PHP server creates a temporary `job-xxxx` branch, commits the job files, starts the workflow, downloads the APK, and deletes the branch.
