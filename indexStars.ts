import { Octokit } from "octokit";
import OpenAI from "@openai/openai";
import { createClient } from "@supabase/supabase-js";
import "@std/dotenv/load";

import { GithubRepo } from "./types.ts";

const octokit = new Octokit({ auth: Deno.env.get("GH_AUTH_TOKEN") });

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_API_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

async function getStarredRepos(limit?: number): Promise<GithubRepo[]> {
  const repos = limit
    ? await octokit.request("GET /user/starred", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      per_page: limit,
    })
    : await octokit.paginate("GET /user/starred", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      per_page: 100,
    });

  if (repos.data) {
    return repos.data as GithubRepo[];
  }

  return repos as GithubRepo[];
}

async function getRepoReadme(name: string): Promise<string> {
  const readme = await octokit.request(`GET /repos/${name}/readme`, {
    headers: {
      "Accept": "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return readme.data || "";
}

async function generateEmbedding(data: string): Promise<number[]> {
  const embedding = await openai.embeddings.create({
    input: data,
    model: "text-embedding-3-small",
    encoding_format: "float",
  });

  return embedding.data[0].embedding;
}

if (import.meta.main) {
  const limit = Deno.args[0] ? parseInt(Deno.args[0], 10) : undefined;

  console.log("fetching starred repositories");
  let starred: GithubRepo[] = [];

  try {
    starred = await getStarredRepos(limit);
  } catch (error) {
    console.log(`failed to fetch stars: ${error}`);
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
    } catch (error) {
      console.error(`${full_name} skipped.`, error);
      continue;
    }

    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(readme);
    } catch (error) {
      console.error(`${full_name} skipped.`, error);
      continue;
    }

    const { error } = await supabase.from("stars").upsert({
      repo: full_name,
      readme: readme,
      embedding: embedding,
    }, {
      onConflict: "repo",
    });

    if (!error) {
      console.log(`${full_name} inserted`);
      count += 1;
    } else {
      console.error(`${full_name} skipped.`, error);
    }
  }

  const end = new Date().getTime();
  console.log(`finished in ${(end - start) / 1000} seconds`);

  Deno.exit();
}
