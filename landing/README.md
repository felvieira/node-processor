# landing

Landing page estática (HTML/CSS/JS puro, sem build) do node-processor.

## Rodar localmente

```bash
docker compose up -d
```

Acessa em `http://localhost:8080`.

## Deploy no Coolify

Aponte o Coolify pra esta pasta com o `docker-compose.yml` — ele detecta o
serviço automaticamente, cuida do proxy reverso e do TLS. Não é necessário
Nginx nem configuração adicional; a variável `PORT` (padrão `8080`) pode ser
sobrescrita se precisar.
