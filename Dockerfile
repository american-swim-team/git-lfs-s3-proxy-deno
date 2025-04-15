FROM denoland/deno:alpine-1.41.1

WORKDIR /app

# Copy your app code
COPY main.ts .
COPY deps.ts .
COPY deno.json .

# Compile (optional but makes startup fast)
RUN deno cache main.ts

EXPOSE 3000

# Run with no file system access, only network
CMD ["run", "--allow-net", "main.ts"]

