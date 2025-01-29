import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const YT_VIDEOS_DATASET_ID = "gd_lk56epmy2i5g7lzu0k";
const YT_CHANNELS_DATASET_ID = "gd_lk538t2k2p1k3oos71";

Deno.serve(async (req) => {
  // supa client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  // fetch tracked serp searches that are not updated in the last 24 hours
  const { data: trackedSearches } = await supabase.from("serp_search").select(
    "*",
  ).eq(
    "is_tracked",
    true,
  ).gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Trigger serp scraping
  await Promise.all(trackedSearches.map(async (search) => {
    await supabase.functions.invoke("collect_serp_data", {
      body: { query: search.query.trim() },
    });
  }));

  // fetch youtube channels that are tracked and not updated in the last 24 hours
  const { data: youtubeChannels } = await supabase.from("yt_channels").select(
    "*",
  ).eq(
    "is_tracked",
    true,
  ).gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data } = await supabase.functions.invoke(
    "trigger_collection_api",
    {
      body: {
        input: youtubeChannels.map((channel) => ({
          url: channel.url,
        })),
        dataset_id: YT_CHANNELS_DATASET_ID,
      },
    },
  );

  // const res = await supabase.functions.invoke("trigger_collection_api", {
  //   body: {
  //     input: youtubeChannels.map((channel) => ({
  //       url: channel.url,
  //       num_of_posts: 2,
  //       order_by: "Latest",
  //     })),
  //     dataset_id: YT_VIDEOS_DATASET_ID,
  //     extra_params: "type=discover_new&discover_by=url",
  //   },
  // });

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  );
});
