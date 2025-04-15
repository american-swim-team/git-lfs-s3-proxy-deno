// handler.ts
import { getSignedUrl } from "aws_s3_presign/mod.ts";
import { logger } from "./logger.ts";

const EXPIRY = 3600;

export type LfsRequestBody = {
  operation: "upload" | "download";
  objects: { oid: string; size: number }[];
};

export async function handler(req: Request): Promise<Response> {
  const start = performance.now();
  const { pathname } = new URL(req.url);

  try {
    if (req.method === "GET" && pathname === "/") {
      logger.info("Redirecting to homepage");
      return Response.redirect(
        "https://github.com/milkey-mouse/git-lfs-s3-proxy",
      );
    }

    if (!pathname.endsWith("/objects/batch") || req.method !== "POST") {
      logger.warn(`Invalid request: ${req.method} ${pathname}`);
      return new Response("Not Found", { status: 404 });
    }

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Basic ")) {
      logger.warn("Missing or invalid Authorization header");
      return new Response("Unauthorized", { status: 401 });
    }

    const [accessKeyId, secretAccessKey] = atob(auth.split(" ")[1]).split(":");
    logger.debug(`AccessKey ID: ${accessKeyId}, secret: (hidden)`);

    const urlParts = pathname.split("/").slice(1, -2);
    const [bucketHost] = urlParts;
    const dotIndex = bucketHost.indexOf(".");
    if (dotIndex === -1) {
      return new Response("Invalid bucket format", { status: 400 });
    }

    const bucket = bucketHost.slice(0, dotIndex);
    const endpoint = bucketHost.slice(dotIndex + 1);

    let body: LfsRequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!["upload", "download"].includes(body.operation)) {
      return new Response("Unsupported operation", { status: 400 });
    }

    logger.info(
      `${body.operation} request for ${body.objects.length} object(s)`,
    );

    const results = await Promise.all(
      body.objects.map(({ oid, size }) => {
        const url = getSignedUrl({
          method: body.operation === "upload" ? "PUT" : "GET",
          bucket,
          region: "us-east-1",
          key: oid,
          accessKeyId,
          secretAccessKey,
          endpoint: `${endpoint}`,
          expiresIn: EXPIRY,
        });

        return {
          oid,
          size,
          authenticated: true,
          actions: {
            [body.operation]: {
              href: url,
              expires_in: EXPIRY,
            },
          },
        };
      }),
    );

    logger.debug(
      `Request complete in ${(performance.now() - start).toFixed(1)}ms`,
    );

    return Response.json({
      transfer: "basic",
      objects: results,
    });
  } catch (err) {
    const duration = (performance.now() - start).toFixed(1);
    if (err instanceof Error) {
      logger.error(`Unhandled error (${duration}ms): ${err.message}`);
    } else {
      logger.error(`Unknown error (${duration}ms)`, { err });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
