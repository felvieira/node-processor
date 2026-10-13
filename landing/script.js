(() => {
  const repository = 'felvieira/node-processor';
  const local = window.NODE_PROCESSOR_RELEASE;
  const links = document.querySelectorAll('[data-download]');
  const notes = document.querySelectorAll('[data-release-note]');
  const checksum = document.querySelector('[data-checksum]');
  function describe(version, size) {
    const mb = (size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    notes.forEach(note => { note.textContent = `v${version} · Windows x64 · ${mb} MB · Instalador .exe`; });
  }
  if (local) describe(local.version, local.size);
  const compare = (a, b) => {
    const left = a.split('.').map(Number), right = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
    return 0;
  };
  async function latest() {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, { signal: AbortSignal.timeout(6000), cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;
    const release = await response.json();
    const version = String(release.tag_name).replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(version) || release.draft || release.prerelease || (local && compare(version, local.version) < 0)) return;
    const asset = release.assets?.find(item => item.name === 'node-processor-setup.exe');
    if (!asset || !Number.isFinite(asset.size) || asset.size < 1) return;
    const stable = `https://github.com/${repository}/releases/latest/download/`;
    links.forEach(link => { link.href = `${stable}node-processor-setup.exe`; });
    if (release.assets.some(item => item.name === 'SHA256SUMS.txt')) checksum.href = `${stable}SHA256SUMS.txt`;
    describe(version, asset.size);
  }
  latest().catch(() => {});
})();
