import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const backendUrl = Deno.env.get("SUPABASE_URL");
const brightDataApiKey = Deno.env.get("BRIGHT_DATA_API_KEY");

async function triggerCollectionApi(
  input: any,
  dataset_id: string,
  extra_params: string,
) {
  const brightDataTriggerUrl = `https://api.brightdata.com/datasets/v3/trigger`;
  const webhookUrl = `${backendUrl}/functions/v1/collection_webhook`;

  const response = await fetch(
    `${brightDataTriggerUrl}?dataset_id=${dataset_id}&endpoint=${webhookUrl}&format=json&uncompressed_webhook=true&include_errors=true&${extra_params}`,
    {
      headers: {
        Authorization: `Bearer ${brightDataApiKey}`,
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

  return data;
}

Deno.serve(async (req) => {
  const { input, dataset_id, extra_params } = await req.json();

  const data = await triggerCollectionApi(input, dataset_id, extra_params);

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
