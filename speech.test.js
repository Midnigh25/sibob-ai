const test = require('node:test');
const assert = require('node:assert/strict');
const { transcribe, transcriptionUrl } = require('./speech');

test('sends audio, key, model and vocabulary and returns trimmed text', async () => {
  const settings = { provider: 'groq', model: 'whisper-large-v3-turbo', vocabulary: 'Sibob' };
  const text = await transcribe(settings, 'test-key', new Uint8Array([1, 2]), async (url, request) => {
    assert.equal(url.hostname, 'api.groq.com');
    assert.equal(request.headers.Authorization, 'Bearer test-key');
    assert.equal(request.redirect, 'error');
    assert.equal(request.body.get('model'), settings.model);
    assert.equal(request.body.get('prompt'), 'Sibob');
    assert.equal(request.body.get('file').size, 2);
    return new Response(JSON.stringify({ text: ' Sibob AI ' }));
  });
  assert.equal(text, 'Sibob AI');
});

test('allows unauthenticated local servers and rejects cleartext remote endpoints', async () => {
  const settings = { provider: 'custom', endpoint: 'http://localhost:8000/transcribe', model: 'local', vocabulary: '' };
  assert.throws(() => transcriptionUrl({ ...settings, endpoint: 'http://example.com/transcribe' }));
  await assert.rejects(transcribe(settings, '', new Uint8Array([1]), async (_url, request) => {
    assert.equal(request.headers.Authorization, undefined);
    assert.equal(request.body.has('prompt'), false);
    return new Response('', { status: 429 });
  }), /HTTP 429/);
});
