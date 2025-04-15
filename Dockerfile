FROM denoland/deno:alpine-1.41.1 as builder

WORKDIR /app
COPY src/ .
RUN deno cache main.ts

FROM denoland/deno:alpine-1.41.1
WORKDIR /app
COPY --from=builder /deno-dir /deno-dir
COPY src/ .

ENV DENO_DIR=/deno-dir
CMD ["run", "--allow-net", "main.ts"]

