import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { query } = await req.json();

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("BRIGHT_DATA_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone: "serp_api1",
      url: `https://www.google.com/search?brd_json=1&q=${
        encodeURIComponent(query)
      }`,
      format: "json",
    }),
  };
  
  const scrapeResponse = await fetch(
    `https://api.brightdata.com/request`,
    options,
  );
  const scrapeData = await scrapeResponse.json();
  const googleData = JSON.parse(scrapeData.body);

  console.log(googleData);

  // store job data in database
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  const { data: serp_search } = await supabase.from("serp_search").insert([{
    request_id: googleData.input.request_id,
    search_engine: "google",
    query: query,
  }]).select().single();

  const { error } = await supabase.from("serp_links").insert(
    googleData.organic.map((result) => ({
      link: result.link,
      title: result.title,
      description: result.description,
      global_rank: result.global_rank,
      serp_request_id: googleData.input.request_id,
    })),
  );
  console.log(error);

  return new Response(
    JSON.stringify({ serp_search }),
    { headers: { "Content-Type": "application/json" } },
  );
});
