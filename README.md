# Celestial Odyssey

Search the stars...

Simple scraper/search for your GitHub stars. Based on - [https://supabase.com/docs/guides/database/extensions/pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)

Make sure you have docker, deno and supabase installed then:

1. `cp .env.example .env`
2. Generate a [Github token](https://github.com/settings/tokens) that allows read access to your stars and add to `.env`
3. Start suapbase: `supabase start`
4. Srape your stared repos: `deno task scrape`
5. Start the service: `deno task start`
6. Test search at [http://localhost:8000](http://localhost:8000)
