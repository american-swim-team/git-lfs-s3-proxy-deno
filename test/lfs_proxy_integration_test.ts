// test/lfs_proxy_integration_test.ts
// TODO add dotenv
import { handler } from "../src/handler.ts";
import { assertEquals, assertExists } from "@std/assert";

const SHOULD_RUN = !!Deno.env.get("RUN_S3_TESTS");

Deno.test({
  name: "S3 integration: presigned upload URL works",
  ignore: !SHOULD_RUN,
  fn: async () => {
    const ACCESS_KEY = Deno.env.get("S3_KEY")!;
    const SECRET_KEY = Deno.env.get("S3_SECRET")!;
    const BUCKET = Deno.env.get("S3_BUCKET")!;
    const ENDPOINT = Deno.env.get("S3_ENDPOINT")!;
    const OID = "test-object-deno-lfs.txt";

    // Step 1: Ask the proxy to sign a URL
    const req = new Request(
      `http://localhost/${BUCKET}.${ENDPOINT}/info/lfs/objects/batch`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${ACCESS_KEY}:${SECRET_KEY}`),
          "Content-Type": "application/vnd.git-lfs+json",
        },
        body: JSON.stringify({
          operation: "upload",
          objects: [
            { oid: OID, size: 15 },
          ],
        }),
      },
    );

    const res = await handler(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    const url = json.objects[0]?.actions?.upload?.href;

    assertExists(url);

    // Step 2: Upload content to the presigned URL

    const upload = await fetch(url, {
      method: "PUT",
      body: new TextEncoder().encode("Hello from Deno!"),
    });

    if (!upload.ok) {
      await upload.body?.cancel();
      throw new Error(`Upload failed with status ${upload.status}`);
    } else {
      await upload.body?.cancel(); // clean up to avoid test leak
    }

    if (![200, 201, 204].includes(upload.status)) {
      throw new Error(`Upload failed with status ${upload.status}`);
    }

    // (Optional) Step 3: Presign a GET URL and download it
    const downloadReq = new Request(
      `http://localhost/${BUCKET}.${ENDPOINT}/info/lfs/objects/batch`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${ACCESS_KEY}:${SECRET_KEY}`),
          "Content-Type": "application/vnd.git-lfs+json",
        },
        body: JSON.stringify({
          operation: "download",
          objects: [
            { oid: OID, size: 15 },
          ],
        }),
      },
    );

    const dlRes = await handler(downloadReq);
    const dlJson = await dlRes.json();
    const downloadUrl = dlJson.objects[0]?.actions?.download?.href;

    assertExists(downloadUrl);

    const fileRes = await fetch(downloadUrl);

    let content: string;

    try {
      content = await fileRes.text(); // Always read the body
    } catch (err) {
      // If read fails, still clean up
      await fileRes.body?.cancel();
      throw new Error(`Failed to read downloaded file: ${err}`);
    }

    // Now assert
    assertEquals(content, "Hello from Deno!");
  },
});
