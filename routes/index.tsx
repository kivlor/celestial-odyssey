import { Handlers, PageProps } from "$fresh/server.ts";

import { searchStars } from "../lib/search.ts";

interface Data {
  results: Result[];
  query: string;
}

interface Result {
  id: number;
  repo: string;
  readme: string;
  similarity: number;
}

interface ResultProps {
  data: Result[];
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";
    
    let results: any[] = [];
    if (query !== "") {
      try {
        results = await searchStars(query);
      } catch (err) {
      }
    }

    return ctx.render({ results, query });
  },
};

function Result({ data }: ResultProps) {
  const { repo, similarity } = data;
  const [owner, name] = repo.split("/");
  const link = `https://github.com/${repo}`;

  return (
    <div class="flex items-center py-4 border-b">
      <div class="grow">
        <h4 class="text-md font-bold">{name}</h4>
        <p><a href={link} class="text-blue-700">{link}</a></p>
      </div>
      <div class="flex-none">
        <p>{parseFloat(similarity).toPrecision(2)}</p>
      </div>
    </div>
  );
}

export default function Page({ data }: PageProps<Data>) {
  const { results, query } = data;

  return (
    <div class="px-4 py-8 mx-auto">
      <div class="max-w-screen-md mx-auto">
        <form>
          <label for="default-search" class="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
          <div class="relative">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                  </svg>
              </div>
              <input type="search" id="default-search" name="query" value={query} class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" placeholder="Search the stars..." required />
              <button type="submit" class="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2">Search</button>
          </div>
        </form>

        <div>
          {results.map((repo) => (<Result data={repo} />))}
        </div>
      </div>
    </div>
  );
}
