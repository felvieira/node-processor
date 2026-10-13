import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../landing/script.js', import.meta.url), 'utf8');
async function render(release, failure = false) {
  const links = Array.from({ length: 3 }, () => ({ href: 'downloads/node-processor-setup.exe' }));
  const notes = [{ textContent: '' }, { textContent: '' }];
  const checksum = { href: 'downloads/SHA256SUMS.txt' };
  const context = { window: { NODE_PROCESSOR_RELEASE: { version: '0.2.0', size: 3_000_000 } }, document: {
    querySelectorAll: selector => selector === '[data-download]' ? links : notes,
    querySelector: () => checksum,
  }, AbortSignal, fetch: async () => { if (failure) throw new Error('offline'); return { ok: true, json: async () => release }; } };
  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { links, notes, checksum };
}
const published = version => ({ tag_name: `v${version}`, draft: false, prerelease: false, assets: [{ name: 'node-processor-setup.exe', size: 4_000_000 }, { name: 'SHA256SUMS.txt' }] });
test('new release switches every CTA and checksum to stable direct assets', async () => {
  const result = await render(published('0.3.0'));
  assert.ok(result.links.every(link => link.href === 'https://github.com/felvieira/node-processor/releases/latest/download/node-processor-setup.exe'));
  assert.match(result.checksum.href, /latest\/download\/SHA256SUMS.txt$/);
  assert.ok(result.notes.every(note => note.textContent.startsWith('v0.3.0')));
});
test('network failure leaves bundled installer usable', async () => {
  const result = await render(null, true);
  assert.ok(result.links.every(link => link.href === 'downloads/node-processor-setup.exe'));
  assert.match(result.notes[0].textContent, /^v0.2.0/);
});
test('old releases, prereleases, drafts and missing installers cannot replace the local build', async () => {
  for (const release of [published('0.1.0'), { ...published('0.3.0'), prerelease: true }, { ...published('0.3.0'), draft: true }, { ...published('0.3.0'), assets: [] }, { ...published('0.3.0'), tag_name: 'invalid' }]) {
    const result = await render(release);
    assert.ok(result.links.every(link => link.href === 'downloads/node-processor-setup.exe'));
  }
});
test('versions compare numerically across double digit updates', async () => {
  const result = await render(published('0.10.0'));
  assert.match(result.notes[0].textContent, /^v0.10.0/);
});
