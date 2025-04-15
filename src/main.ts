// main.ts
import { handler } from "./handler.ts";

Deno.serve({ port: 3000 }, handler);
