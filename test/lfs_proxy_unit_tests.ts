import { assertEquals, assertExists, assertMatch } from "@std/assert";
import { handler } from "../src/handler.ts";

const AUTH_HEADER = "Basic " + btoa("fakeKey:fakeSecret");
const URL =
  "http://localhost/swim-bucket.fake-endpoint.com/info/lfs/objects/batch";

Deno.test("GET / should redirect to homepage", async () => {
  const req = new Request("http://localhost/", { method: "GET" });
  const res = await handler(req);
  assertEquals(res.status, 302);
});

Deno.test("Non-/objects/batch path should return 404", async () => {
  const req = new Request("http://localhost/invalid", { method: "POST" });
  const res = await handler(req);
  assertEquals(res.status, 404);
});

Deno.test("Non-POST method on /objects/batch should return 404", async () => {
  const req = new Request(URL, { method: "GET" });
  const res = await handler(req);
  assertEquals(res.status, 404);
});

Deno.test("Missing Authorization header returns 401", async () => {
  const req = new Request(URL, { method: "POST" });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test("Malformed Authorization header returns 401", async () => {
  const req = new Request(URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
    },
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

Deno.test("Invalid JSON body returns 400", async () => {
  const req = new Request(URL, {
    method: "POST",
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: "not-json",
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("Unsupported operation returns 400", async () => {
  const req = new Request(URL, {
    method: "POST",
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation: "delete", // unsupported
      objects: [],
    }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("Valid upload batch returns presigned URL", async () => {
  const req = new Request(URL, {
    method: "POST",
    headers: {
      Authorization: AUTH_HEADER,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation: "upload",
      objects: [
        { oid: "abc123", size: 1234 },
      ],
    }),
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.transfer, "basic");
  assertEquals(json.objects.length, 1);
  assertEquals(json.objects[0].oid, "abc123");
  assertExists(json.objects[0].actions.upload.href);
  assertMatch(json.objects[0].actions.upload.href, /^https:\/\/.+\?.+X-Amz-/);
});
