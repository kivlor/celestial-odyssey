#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { embedStars } from "./embed.ts";

import "$std/dotenv/load.ts";

await dev(import.meta.url, "./main.ts", config);

if (!Deno.args.includes("build")) {
  Deno.cron(
    "0 0 * * *",
    async () => {
      await embedStars();
    },
  );
}
