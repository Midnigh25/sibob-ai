# Sibob AI

Sibob AI is an Electron desktop dictation app. Press a global shortcut to start and stop recording. The app transcribes your audio, displays the result, and copies it to your clipboard for pasting into another app.

## Run from source

Install Node.js 22 or newer with npm. From this folder, run:

```sh
npm install
npm start
```

Allow microphone access when prompted. Keep the app open while dictating. The default shortcut is Ctrl+Shift+Space on Windows and Linux and Cmd+Shift+Space on macOS. Focus the shortcut field, press a key or combination, and save. Some keys are reserved by your operating system or already registered by another app. Global shortcuts also depend on desktop support under Wayland.

## Providers and vocabulary

Select OpenAI or Groq, or enter the full URL and model for an OpenAI-compatible audio transcription endpoint. Custom servers must accept multipart WebM audio, a model, and an optional prompt, and return JSON with a text field. Enter your own bearer API key. A custom server can also run without authentication. HTTPS is required for remote endpoints.

Enter names, acronyms, and other terms in Custom vocabulary. Sibob sends the list as a transcription prompt. Whether it influences spelling depends on the selected model. Audio and vocabulary go to the provider you select. API keys are stored locally through Electron's OS-backed encryption and cleared when the endpoint changes unless a replacement is entered. Linux needs a supported keyring to save keys.

## Checks

```sh
npm run check
```

## Publish on GitHub

After running npm install, commit the source and generated package-lock.json. Authenticate with GitHub CLI, then run these commands from the project folder:

```sh
git init
git add .
git commit -m "Build Sibob AI desktop dictation MVP"
gh repo create sibob-ai --private --source=. --remote=origin --push
```

## Windows installer

Open **Actions → Build Windows installer** in the GitHub repository. Select
**Run workflow** on the default branch or open the run started when the
workflow file was committed. Once the run succeeds, download the
**Sibob-AI-Windows-x64** artifact from the run summary. Extract the downloaded
ZIP and run **Sibob-AI-Setup-0.1.0-x64.exe** on 64-bit Windows. The installer
is unsigned, so Windows may display a publisher warning.

Open **Sibob AI** from the Start menu after installation. Add your provider
API key in Settings. The build itself needs no transcription API key.

To build the installer on a Windows development machine, run `npm ci` and
`npm run dist:win`. The installer appears in `dist/`.
