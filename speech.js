const providers = {
  openai: { url: 'https://api.openai.com/v1/audio/transcriptions', model: 'gpt-4o-mini-transcribe' },
  groq: { url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo' }
};

function transcriptionUrl(settings) {
  const url = new URL(providers[settings.provider]?.url ?? settings.endpoint);
  if (url.username || url.password || (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  )) throw new Error('Use HTTPS or a local HTTP endpoint.');
  return url;
}

async function transcribe(settings, key, audio, request = fetch) {
  const body = new FormData();
  body.set('file', new Blob([audio], { type: 'audio/webm' }), 'dictation.webm');
  body.set('model', settings.model);
  if (settings.vocabulary.trim()) body.set('prompt', settings.vocabulary.trim());

  const response = await request(transcriptionUrl(settings), {
    method: 'POST',
    headers: key ? { Authorization: 'Bearer ' + key } : {},
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(90_000)
  });
  if (!response.ok) throw new Error('Transcription provider returned HTTP ' + response.status + '.');
  const { text } = await response.json();
  if (typeof text !== 'string' || !text.trim()) throw new Error('No speech was returned.');
  return text.trim();
}

module.exports = { providers, transcriptionUrl, transcribe };
