# Landing e distribuição Windows

Página estática em HTML/CSS/JS. `index.html` funciona diretamente pelo arquivo ou em um servidor estático. A linguagem visual acompanha TeamScript e LinkVault: papel claro, títulos editoriais, demonstração do produto e assinatura de Felipe Vieira, com verde próprio do node-processor.

## Gerar instalador e atualizar o download

Na raiz do repositório, em Windows com Node, Rust e Build Tools:

```powershell
npm ci
npm run release:build
```

Esse comando compila o app, gera o instalador NSIS e atualiza automaticamente:

- `downloads/node-processor-setup.exe`: nome estável usado em todos os botões.
- `downloads/release.json` e `release.js`: versão e tamanho reais do arquivo; o JS permite abrir a página via `file://` sem fetch local.
- `downloads/SHA256SUMS.txt`: hash completo do instalador.

O empacotamento rejeita divergência entre `package.json` e `tauri.conf.json`. Atualize também `src-tauri/Cargo.toml` e os lockfiles ao mudar a versão. Executar somente `tauri build` gera o bundle; use `release:build` para também atualizar a cópia da landing.

## Atualizações públicas sem editar a landing

Após publicar o código e a primeira release no GitHub, uma tag `vX.Y.Z` dispara `.github/workflows/release.yml`. O workflow valida a versão, compila em Windows e publica o asset `node-processor-setup.exe` com nome estável. Execução manual produz um artifact sem publicar release.

A página consulta a última release estável de `felvieira/node-processor` e aponta os botões diretamente para `https://github.com/felvieira/node-processor/releases/latest/download/node-processor-setup.exe`. Versões anteriores, drafts e prereleases não substituem a cópia local. Se a API estiver indisponível, o instalador incluído em `downloads/` continua disponível. Publique essa pasta junto da página.

Isso atualiza o download oferecido pelo site. O app instalado não tem auto-updater: o usuário executa o novo instalador para atualizar.

## Windows

- NSIS por usuário, interface em português, ícones incorporados e atalhos.
- Primeira instalação registra `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\node-processor` com o executável instalado e `--background`.
- No próximo login do Windows o app inicia na bandeja, sem abrir a janela.
- Fechar a janela oculta o app; menu da bandeja: Abrir e Sair.
- Uma segunda execução reutiliza a instância existente.
- A desinstalação remove a entrada de inicialização; modo `/UPDATE` a preserva.
- O usuário pode desativar a inicialização nas configurações do Windows.
- O executável não possui assinatura Authenticode. O hash verifica integridade, não substitui assinatura.

## Vídeo

```powershell
npm run video:render
```

Requer Python e FFmpeg. `scripts/render-demo.py` produz `assets/node-processor-demo.mp4`: 20 segundos, H.264, 1600×900, 30 fps, sem áudio. Usa a captura existente do app com movimentos de câmera e textos de apresentação. Não é uma gravação de interação nem uma medição atual do computador. O player usa controles nativos e não toca automaticamente.

## Validação

```powershell
node --test scripts/check-release.test.mjs
npm run release:build
```

Os testes cobrem troca para nova release, comparação numérica de versões, falha de rede e exclusão de releases sem instalador. A revisão visual desktop/mobile e a instalação com novo login no Windows são verificações separadas do build.

## Publicação

Envie o conteúdo completo de `landing/`, incluindo MP4 e `downloads/`, ao servidor estático. Para Coolify, a configuração atual está em `docker-compose.yml`; configure o domínio e TLS no serviço. Use sempre o nome de projeto `node-processor-landing`. Servidores locais persistentes devem passar pelo dev-registry canônico, nunca ser iniciados com processos soltos.

O script canônico está em `D:/Codex-memory/scripts/dev-registry.ps1`. Nenhum servidor persistente foi iniciado nesta entrega. A inspeção pelo navegador de `file://` foi bloqueada pela política da ferramenta; a validação executada foi estrutural e de build, não uma revisão visual desktop/mobile.
