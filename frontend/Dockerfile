# Build stage
FROM node:20-alpine AS build
WORKDIR /web
COPY frontend /web
RUN npm ci || npm i
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
