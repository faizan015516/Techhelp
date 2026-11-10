# Serve the complete static site with Nginx. Cloudflare Pages Functions in
# functions/api are not executed by this container (see README / deployment notes).
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
