import { pipeline } from "@huggingface/transformers";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { Octokit } from "https://esm.sh/octokit?dts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const featureExtraction = await pipeline(
  "feature-extraction",
  "Supabase/gte-small",
);

const env = await load();

const octokit = new Octokit({ auth: env["GH_AUTH_TOKEN"] });

const supabase = createClient(
  env["SUPABASE_API_URL"],
  env["SUPABASE_ANON_KEY"],
);

async function getStarredRepos() {
  return await octokit.paginate("GET /user/starred", {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
    per_page: 100,
  });
};

async function getRepoReadme(name: string){
  const readme = await octokit.request(`GET /repos/${name}/readme`, {
    headers: {
      "Accept": "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
  });

  return readme?.data;
};

async function generateEmbedding(data: string){
  const output = await featureExtraction(data, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
};

if (import.meta.main) {
  console.log("fetching starred repositories");
  let starred: any[] = [];

  try {
    starred = await getStarredRepos();
  } catch(error) {
    console.log(`failed to fetch stars: ${error.message}`);
    Deno.exit();
  }

  console.log(`creating embeddings for ${starred.length} repositories`);
  const start = new Date().getTime();
  let count = 0;

  for (let i = 0; i < starred.length; i++) {
    const repo = starred[i];
    const { full_name } = repo;

    let readme = "";
    try {
      readme = await getRepoReadme(full_name);
    } catch(error) {
      console.log(`${full_name} skipped: ${error.message}`);
      continue;
    }

    let embedding: any[] = [];
    try {
      embedding = await generateEmbedding(readme);
    } catch(error) {
      console.log(`${full_name} skipped: ${error.message}`);
      continue;
    }

    const { data, error } = await supabase.from("stars").upsert({
      repo: full_name,
      readme: readme,
      embedding: embedding,
    }, {
      onConflict: 'repo'
    });

    if (!error) {
      console.log(`${full_name} inserted`);
      count += 1;
    } else {
      console.log(`${full_name} skipped`);
    }
  }

  const end = new Date().getTime();
  console.log(`finished in ${(end - start) / 1000} seconds`);

  Deno.exit();
}
