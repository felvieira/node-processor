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
- A ferramenta de navegador recusou o acesso a `file://`. Não foi realizada inspeção visual desktop/mobile, navegação por teclado, screen reader ou teste do player no navegador.
- A página e a primeira release ainda não foram publicadas. O workflow está preparado, mas não executado no GitHub. O domínio do site foi solicitado ao usuário.
- O instalador é distribuído sem assinatura Authenticode.

A versão anterior de `landing/index.html`, já modificada antes desta tarefa, foi preservada em `index.before-redesign.html.local`, na raiz e ignorada pelo Git.
