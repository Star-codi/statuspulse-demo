FROM nginx:1.27-alpine

# nginx auto-renders templates/*.template -> conf.d/*.conf via envsubst at startup
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY index.html style.css app.js /usr/share/nginx/html/

# Default backend hostname; override at `docker run -e BACKEND_HOST=...`
# In docker-compose this is the service name "backend"
# In Kubernetes this is the Service name "backend"
ENV BACKEND_HOST=backend

EXPOSE 80
