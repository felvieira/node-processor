FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css script.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY downloads/ /usr/share/nginx/html/downloads/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
