const form = document.querySelector('#settings');
const field = name => form.elements.namedItem(name);
const record = document.querySelector('#record');
const status = document.querySelector('#status');
const saveStatus = document.querySelector('#save-status');
const transcript = document.querySelector('#transcript');
const modelDefaults = { openai: 'gpt-4o-mini-transcribe', groq: 'whisper-large-v3-turbo' };
let recorder;
let busy = false;
let saved;

function syncProvider() {
  const custom = field('provider').value === 'custom';
  document.querySelector('#endpoint-row').hidden = !custom;
  field('endpoint').required = custom;
  field('endpoint').disabled = !custom;
}

function showSettings(settings) {
  saved = settings;
  for (const name of ['provider', 'endpoint', 'model', 'vocabulary', 'shortcut', 'theme']) {
    field(name).value = settings[name];
  }
  field('key').value = '';
  field('key').placeholder = settings.hasKey ? 'Key saved. Enter a replacement to change it.' : 'Enter your provider key';
  field('clearKey').checked = false;
  document.documentElement.dataset.theme = settings.theme;
  syncProvider();
}

function showReady() {
  status.textContent = saved.activeShortcut
    ? 'Press ' + saved.activeShortcut + ' or use the recording button.'
    : 'Use the recording button or save an available global shortcut.';
}

field('provider').addEventListener('change', () => {
  field('model').value = modelDefaults[field('provider').value] ?? '';
  syncProvider();
});
field('theme').addEventListener('change', () => {
  document.documentElement.dataset.theme = field('theme').value;
});

field('shortcut').addEventListener('keydown', event => {
  if (event.key === 'Tab') return;
  event.preventDefault();
  if (['Control', 'Shift', 'Alt', 'Meta', 'Unidentified', 'Dead'].includes(event.key)) return;
  const names = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left',
    ArrowRight: 'Right', '=': '=', '+': 'Plus' };
  const key = names[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  field('shortcut').value = [
    event.ctrlKey && 'Control', event.metaKey && (navigator.platform.startsWith('Mac') ? 'Command' : 'Super'), event.altKey && 'Alt',
    event.shiftKey && 'Shift', key
  ].filter(Boolean).join('+');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.clearKey = field('clearKey').checked;
  field('fields').disabled = true;
  try {
    showSettings(await window.sibob.saveSettings(data));
    if (!busy && !recorder) showReady();
    saveStatus.textContent = 'Settings saved.';
  } catch (error) {
    saveStatus.textContent = error.message;
  } finally {
    field('fields').disabled = false;
  }
});

async function finishRecording(chunks, stream) {
  stream.getTracks().forEach(track => track.stop());
  recorder = undefined;
  record.disabled = true;
  record.textContent = 'Start recording';
  status.textContent = 'Transcribing…';
  try {
    const audio = new Uint8Array(await new Blob(chunks).arrayBuffer());
    transcript.value = await window.sibob.transcribe(audio);
    status.textContent = 'Copied to clipboard. Paste into any app.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
    record.disabled = false;
  }
}

async function toggleRecording() {
  if (busy || !saved) return;
  if (recorder) {
    busy = true;
    recorder.stop();
    return;
  }

  busy = true;
  record.disabled = true;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    recorder.addEventListener('dataavailable', event => chunks.push(event.data));
    recorder.addEventListener('stop', () => finishRecording(chunks, stream), { once: true });
    recorder.start();
    record.textContent = 'Stop recording';
    status.textContent = 'Recording. Use the same shortcut or button to stop.';
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    recorder = undefined;
    status.textContent = error.message;
  } finally {
    busy = false;
    record.disabled = false;
  }
}

record.addEventListener('click', toggleRecording);
window.sibob.onToggle(toggleRecording);
window.sibob.getSettings().then(settings => {
  showSettings(settings);
  showReady();
  field('fields').disabled = false;
  record.disabled = false;
}).catch(error => { status.textContent = error.message; });
