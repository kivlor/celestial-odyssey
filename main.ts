/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";
import { start } from "$fresh/server.ts";

import { embedStars } from "./embed.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

Deno.cron("embed", "0 0 * * *", async () => {
  await embedStars();
});

await start(manifest, config);
