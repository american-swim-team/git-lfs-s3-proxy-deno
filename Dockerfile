FROM denoland/deno:alpine-1.41.1

WORKDIR /app

# Copy everything we need: config and source files
COPY deno.json ./
COPY src/ ./src

# Cache deps for faster startup (optional)
RUN deno cache src/main.ts

EXPOSE 3000

# Use deno.json for imports, permissions kept tight
CMD ["task", "start"]

