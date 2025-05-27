import { Handlers, PageProps } from "$fresh/server.ts";
import OpenAI from "@openai/openai";
import { createClient } from "@supabase/supabase-js";
import { SearchResult, StarRecord } from "../types.ts";
import "@std/dotenv/load";

interface Data {
  results: SearchResult[];
  query: string;
}

async function searchStars(query: string): Promise<SearchResult[]> {
  const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const embedding = await openai.embeddings.create({
      input: query,
      model: "text-embedding-3-small",
      encoding_format: "float",
    });

    const { data: stars, error } = await supabase.rpc(
      "search_stars",
      {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.3,
        match_count: 20,
      },
    );

    if (error) {
      console.error("Supabase RPC error:", error);
      return [];
    }

    return stars?.map((star: StarRecord) => ({
      id: star.id,
      repo: star.repo,
      readme: star.readme,
      name: star.repo.split("/")[1] ?? "",
      link: `https://github.com/${star.repo}`,
      similarity: star.similarity ?? 0,
    })) || [];
  } catch (error) {
    console.error("Error in searchStars:", error);
    return [];
  }
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";

    const results = query !== "" ? await searchStars(query) : [];

    return ctx.render({ results, query });
  },
};

export default function Home({ data }: PageProps<Data>) {
  const { results, query } = data;

  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-md mx-auto space-y-4">
        <header class="space-y-2">
          <h1 class="text-3xl font-bold">Celestial Odyssey</h1>
          <p>Search your Github Stars</p>
        </header>

        <main class="space-y-2">
          <form>
            <label
              for="default-search"
              class="text-sm font-medium text-gray-900 sr-only"
            >
              Search
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  class="w-4 h-4 text-gray-500"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="search"
                id="default-search"
                name="query"
                value={query}
                class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search the stars..."
                required
              />
              <button
                type="submit"
                class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
              >
                Search
              </button>
            </div>
          </form>

          <div>
            {results.map((result) => (
              <div class="flex items-center py-4 border-b">
                <div class="grow">
                  <h4 class="text-md font-bold">{result.name}</h4>
                  <p>
                    <a href={result.link} class="text-blue-700">
                      {result.link}
                    </a>
                  </p>
                </div>
                <div class="flex-none">
                  <p>
                    {result.similarity.toPrecision(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
