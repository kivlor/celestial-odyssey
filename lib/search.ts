import { pipeline } from "@huggingface/transformers";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = await load();

const supabase = createClient(
  env["SUPABASE_API_URL"],
  env["SUPABASE_ANON_KEY"],
);

export async function generateEmbedding(data: string){
  const featureExtraction = await pipeline(
    "feature-extraction",
    "Supabase/gte-small",
  );

  const output = await featureExtraction(data, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
};

export async function searchStars(query: string) {
  const embedding = await generateEmbedding(query);

  const { data: stars } = await supabase.rpc('search_stars', {
    query_embedding: embedding, // Pass the embedding you want to compare
    match_threshold: 0.78, // Choose an appropriate threshold for your data
    match_count: 10, // Choose the number of matches
  });

  return stars;
}
