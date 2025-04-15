# git-lfs-s3-proxy-deno

A minimal Git LFS transfer adapter that signs secure, pre-signed URLs for uploading and downloading Git LFS objects to any S3-compatible storage (e.g. AWS S3, Linode Object Storage, DigitalOcean Spaces, MinIO, etc.).

Built with [Deno](https://deno.land/) for zero-dependency, container-friendly, high-performance deployment.

---

## 🚀 Features

- 🔐 Supports Git LFS basic transfer adapter
- 🏷️ Pre-signs `PUT` (upload) and `GET` (download) URLs to S3
- 🧱 S3-compatible: works with Linode, AWS, DO Spaces, MinIO
- 🦕 Fully TypeScript and Deno-native
- 🧪 Built-in test suite (unit + optional integration tests)
- 🐳 Easy to containerize for Nomad, Docker, K8s, etc.

---

## 🔧 How It Works

Git LFS sends a `batch` request like:

```
POST /my-bucket.region.s3-provider.com/info/lfs/objects/batch
```

This proxy:
1. Parses your `Basic` auth as S3 credentials
2. Extracts the bucket + endpoint from the URL
3. Responds with pre-signed URLs Git LFS can use directly

---

## 📦 Getting Started

### ⚙️ Requirements

- Deno 2.2+
- A Git LFS client configured to use this proxy
- An S3-compatible bucket

---

### 🧪 Running Locally

```bash
deno task start
```

Then send requests like:

```bash
curl -X POST http://localhost/git-lfs-bucket.us-east-1.linodeobjects.com/info/lfs/objects/batch \
  -u "$ACCESS_KEY:$SECRET_KEY" \
  -H "Content-Type: application/vnd.git-lfs+json" \
  -d '{
    "operation": "upload",
    "objects": [
      { "oid": "abc123", "size": 1024 }
    ]
  }'
```

---

## 🔐 Authentication

This proxy uses `Basic` auth to receive your S3 credentials:

```
Authorization: Basic <base64(accessKeyId:secretAccessKey)>
```

These are used only for signing pre-signed URLs — no credentials are stored.

---

## 🧪 Testing

### 🧪 Unit Tests

Run all logic-level tests (no S3 access required):

```bash
deno test test/lfs_proxy_unit_test.ts
```

### 🌐 Integration Tests (S3)

Set the following environment variables:

```bash
export RUN_S3_TESTS=true
export S3_KEY=your_access_key
export S3_SECRET=your_secret_key
export S3_BUCKET=your-test-bucket
export S3_ENDPOINT=us-east-1.linodeobjects.com
```

Then run:

```bash
deno test --allow-net --allow-env test/lfs_proxy_integration_test.ts
```

---

## 🛠 Configuration

| Component | How it's configured |
|----------|---------------------|
| Bucket    | From the path segment in the LFS request |
| Endpoint  | From the path (e.g., `us-east-1.linodeobjects.com`) |
| Credentials | From Basic Auth |
| Expiry    | Hardcoded to 3600s (configurable in `handler.ts`) |

---

## 🐳 Docker

```Dockerfile
FROM denoland/deno:alpine-2.2.1

WORKDIR /app
COPY . .

RUN deno cache main.ts

EXPOSE 3000
CMD ["run", "--allow-net", "main.ts"]
```

Build & run:

```bash
docker build -t lfs-proxy .
docker run -p 3000:3000 lfs-proxy
```

---

## 🤖 GitHub Actions CI

✅ Unit tests run on every PR  
✅ Integration tests run only if S3 credentials are set as secrets

See: `.github/workflows/test.yml`

---

## 🙋 FAQ

**Q: Can I use this with AWS S3?**  
A: Yes. Just set the endpoint to `s3.amazonaws.com`.

**Q: Does it support Cloudflare R2?**  
A: Yes, as long as you provide the correct R2 S3-compatible endpoint.

**Q: Can I self-host with MinIO?**  
A: Yes. Set `S3_ENDPOINT` and use path-style mode.

---

## 🧠 Credits

Originally inspired by [milkey-mouse/git-lfs-s3-proxy](https://github.com/milkey-mouse/git-lfs-s3-proxy), rewritten in Deno with testing, structured logging, and S3 flexibility.

---

## 📄 License

MIT
