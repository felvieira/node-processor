# Produção

- Site: https://nodeprocessor.felvieira.com.br
- VPS: 161.97.122.92, mesma do LinkVault.
- Coolify: hosting.felvieira.com.br, projeto Pessoais, ambiente production.
- Aplicação: `yn1dy5jtpzch4p9rq0szvtov`.
- Repositório: `felvieira/node-processor`, branch `main`.
- Build context: `/landing`; Dockerfile: `/Dockerfile`; porta interna 80.
- Health check: `/healthz`.
- TLS: proxy existente do Coolify, Let's Encrypt; nenhuma porta de host adicional.

O Dockerfile inclui somente HTML, CSS, JS, assets e downloads. Documentação e backups não são servidos.

Para atualizar a página, publique as alterações em main e dispare o deploy dessa aplicação no Coolify. Para nova versão do aplicativo, atualize as versões, execute `npm run release:build` e publique uma tag `vX.Y.Z`: o workflow Windows publica a release com o instalador de nome estável. O site reconhece essa release automaticamente.

Cliente local canônico: `D:/Repos/GERAL/vps/coolify/coolify.py hosting deploy yn1dy5jtpzch4p9rq0szvtov`. Credenciais permanecem fora deste repositório.

Rollback: redeploy do último commit saudável no mesmo recurso Coolify. Para o aplicativo, ofereça a versão anterior pelo histórico de releases; nunca substitua silenciosamente uma tag já publicada.
