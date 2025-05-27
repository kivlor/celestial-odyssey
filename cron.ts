import { createClient } from "jsr:@supabase/supabase-js";
import { Octokit } from "octokit";
import OpenAI from "@openai/openai";

import { GithubRepo } from "./types.ts";

const octokit = new Octokit({ auth: Deno.env.get("GH_AUTH_TOKEN") });

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

export async function getStarredRepos(limit?: number): Promise<GithubRepo[]> {
  if (limit) {
    const response = await octokit.request("GET /user/starred", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      per_page: limit,
    });
    return response.data as GithubRepo[];
  } else {
    const repos = await octokit.paginate(
      octokit.rest.activity.listReposStarredByAuthenticatedUser,
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        per_page: 100,
      },
    );
    return repos as GithubRepo[];
  }
}

export async function getRepoReadme(name: string): Promise<string> {
  const readme = await octokit.request(`GET /repos/${name}/readme`, {
    headers: {
      "Accept": "application/vnd.github.raw+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  // Clean readme by removing HTML tags, emojis, and markdown syntax
  let readmeText = typeof readme.data === "string" ? readme.data : "";
  if (readmeText === "") {
    return "";
  }

  readmeText = readmeText.replace(/<[^>]*>/g, "");
  readmeText = readmeText.replace(
    /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F700}-\u{1F77F}|\u{1F780}-\u{1F7FF}|\u{1F800}-\u{1F8FF}|\u{1F900}-\u{1F9FF}|\u{1FA00}-\u{1FA6F}|\u{1FA70}-\u{1FAFF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
    "",
  );
  readmeText = readmeText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  readmeText = readmeText.replace(/^#+\s+/gm, "");
  readmeText = readmeText.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");
  readmeText = readmeText.replace(/```[\s\S]*?```/g, "");
  readmeText = readmeText.replace(/`([^`]+)`/g, "$1");
  readmeText = readmeText.replace(/^[\s]*[-*+][\s]+/gm, "");
  readmeText = readmeText.replace(/^[\s]*\d+\.[\s]+/gm, "");
  readmeText = readmeText.replace(/\n{3,}/g, "\n\n");

  return readmeText.trim();
}

export async function generateEmbedding(data: string): Promise<number[]> {
  let embedding: number[] = [];

  try {
    const response = await openai.embeddings.create({
      input: data,
      model: "text-embedding-3-small",
      encoding_format: "float",
    });

    embedding = response.data[0].embedding;
  } catch {
    //
  }

  return embedding;
}

export async function embedStars(limit?: number): Promise<void> {
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

    if (embedding.length === 0) {
      console.error(`${full_name} skipped.`);
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

  return;
}

if (!Deno.args.includes("build")) {
  Deno.cron(
    "0 0 * * *",
    async () => {
      await embedStars();
    },
  );
}
