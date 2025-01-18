import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// const YT_CHANNELS = "gd_lk538t2k2p1k3oos71"
Deno.serve(async (req) => {
  const { input, dataset_id, extra_params } = await req.json();

  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${dataset_id}&endpoint=${
      Deno.env.get("SUPABASE_URL")
    }/functions/v1/collection_webhook&format=json&uncompressed_webhook=true&include_errors=true&${extra_params}`,
    {
      headers: {
        Authorization: `Bearer ${Deno.env.get("BRIGHT_DATA_API_KEY")}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to trigger collection");
  }

  const data = await response.json();

  // store job data in database
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  const { data: scrapeJob } = await supabase.from("scrape_jobs").insert({
    id: data.snapshot_id,
    status: "running",
    dataset_id,
  }).select().single();

  return new Response(JSON.stringify(scrapeJob), {
    headers: { "Content-Type": "application/json" },
  });
});
