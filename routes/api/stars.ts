import { FreshContext } from "$fresh/server.ts";

import {
  env as transformerEnv,
  pipeline,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = await load();

const supabase = createClient(
  env["SUPABASE_API_URL"],
  env["SUPABASE_ANON_KEY"],
);

export const handler = async (req: Request, ctx: FreshContext): Promise<Response> => {
  const { url } = req;
  const { searchParams } = new URL(url);
  const search = searchParams.get("s");

  if (!search) {
    return new Response(JSON.stringify([]));  
  }

  transformerEnv.allowLocalModels = false;
  transformerEnv.backends.onnx.wasm.numThreads = 1;
  const featureExtraction = await pipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const generateEmbedding = await featureExtraction(search, {
    pooling: "mean",
    normalize: true,
  });

  

  return new Response(JSON.stringify({ search: search, embedding: Array.from(searchVector.data) }));
};
