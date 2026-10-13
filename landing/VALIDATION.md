# Validação local · 13/10/2026

## Evidências concluídas

- `npm run release:build`: TypeScript, Vite, Rust release e NSIS concluídos com exit 0. Aviso inicial no hook foi corrigido; build final sem o aviso.
- `node --test scripts/check-release.test.mjs`: 4 testes aprovados, 0 falhas. Inclui versão nova, comparação numérica, indisponibilidade de rede, release antiga, prerelease, draft e asset ausente.
- Smoke do executável gerado: vivo após iniciar com `--background`; segunda execução saiu com código 0 e apenas uma instância permaneceu. Somente os processos criados por esse teste foram encerrados ao final.
- Conferência dos 14 recursos locais e 5 âncoras: arquivos e destinos existentes; um H1; imagens com atributo alt.
- Instalador comparado com o manifesto: tamanho e SHA-256 correspondem. Metadados atuais ficam em `downloads/release.json`.
- Contraste dos pares principais: texto secundário/papel 5,02:1; verde/papel 6,21:1; branco/verde 6,84:1; texto secundário/fundo escuro 8,38:1. Isso não constitui auditoria completa de acessibilidade.
- MP4 conferido por ffprobe: H.264, 1600×900, 30 fps, duração de 20 segundos, sem áudio. Um frame foi inspecionado visualmente.
- `npm update source-map-js`: correção compatível da vulnerabilidade apontada na instalação de dependências; auditoria resultante com 0 vulnerabilidades.
- `git diff --check`: sem erros de whitespace.

## Limites da validação

- Não foi realizada instalação no perfil do usuário, desinstalação, upgrade de uma instalação anterior ou reinicialização/login real do Windows. Persistência está implementada pelo hook NSIS e deve ser homologada nesses fluxos.
- Menu de bandeja e fechamento da janela ainda exigem validação interativa. O smoke de processos não cobre esses cliques.
- O acesso inicial a `file://` foi bloqueado; após a publicação HTTPS, a página foi revisada visualmente em desktop e viewport mobile de 390×844, sem overflow horizontal no mobile. O vídeo foi acionado por teclado e confirmado em reprodução (11,4/20 segundos, readyState 4, sem erro). Não foi realizada auditoria completa de teclado ou screen reader.
- O workflow para tags futuras está preparado, mas ainda não foi executado no GitHub; a primeira release foi publicada com o instalador compilado e validado localmente.
- O instalador é distribuído sem assinatura Authenticode.

A versão anterior de `landing/index.html`, já modificada antes desta tarefa, foi preservada em `index.before-redesign.html.local`, na raiz e ignorada pelo Git.

## Publicação confirmada

- Domínio: https://nodeprocessor.felvieira.com.br, na VPS 161.97.122.92.
- Coolify: aplicação `yn1dy5jtpzch4p9rq0szvtov`, deployment `djycqr1ndqlrepn4rx87x8a9`, commit `f89d014`, status `finished`, container `healthy`.
- HTTPS validado sem ignorar certificados; `/`, `/healthz`, vídeo MP4 e instalador retornaram HTTP 200.
- Instalador servido pela VPS: 2.991.483 bytes, SHA-256 `efe14da75d0ee673def0f6a7bd4a3cca1b41c645f0c48a6999cfb6a1d5dc1f69`, idêntico ao local.
- Release https://github.com/felvieira/node-processor/releases/tag/v0.2.0 publicada. Download estável `/releases/latest/download/node-processor-setup.exe` conferido com HTTP 200 e mesmo SHA-256.
- DOM da página pública confirmou os três CTAs apontando para o asset da última release e metadados v0.2.0 / 2,9 MB.
