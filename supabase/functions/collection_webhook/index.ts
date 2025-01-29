import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const YT_CHANNELS_DATASET_ID = "gd_lk538t2k2p1k3oos71";
const YT_VIDEOS_DATASET_ID = "gd_lk56epmy2i5g7lzu0k";
const YOUTUBE_COMMENTS = "gd_lk9q0ew71spt1mxywf";

async function saveChannel(
  supabase: SupabaseClient,
  data: any,
  snapshot_id: string,
) {
  // save channel to database
  const ytChannelsRes = await supabase.from("yt_channels").upsert(
    data.map((item: any) => ({
      id: item.id,
      updated_at: new Date().toISOString(),
      url: item.url.replace("/about", ""),
      handle: item.handle,
      banner_img: item.banner_img,
      profile_image: item.profile_image,
      name: item.name,
      subscribers: item.subscribers,
      videos_count: item.videos_count,
      created_date: item.created_date,
      views: item.views,
      Description: item.Description,
      location: item.Details?.location,
    })),
  );

  // update scrape_jobs table status to "ready"
  await supabase.from("scrape_jobs").update({
    status: "ready",
    channel_id: data[0].id,
  }).eq(
    "id",
    snapshot_id,
  );

  // trigger videos scraping for the channel
  const res = await supabase.functions.invoke("trigger_collection_api", {
    body: {
      dataset_id: YT_VIDEOS_DATASET_ID,
      input: [{ url: data[0].url, num_of_posts: 5, order_by: "Latest" }],
      extra_params: "type=discover_new&discover_by=url",
    },
  });

  return true;
}

async function saveVideos(
  supabase: SupabaseClient,
  data: any,
  snapshot_id: string,
) {
  // save videos to database
  const { error } = await supabase.from("yt_videos").upsert(
    data.map((item: any) => ({
      id: item.video_id,
      updated_at: new Date().toISOString(),
      url: item.url,
      title: item.title,
      likes: item.likes,
      views: item.views,
      date_posted: item.date_posted,
      description: item.description,
      num_comments: item.num_comments,
      preview_image: item.preview_image,
      youtuber_id: item.youtuber_id,
      transcript: item.transcript,
    })),
  );

  // update scrape_jobs table status to "ready"
  await supabase.from("scrape_jobs").update({
    status: "ready",
    // channel_id: data[0].youtuber_id,
  }).eq(
    "id",
    snapshot_id,
  );

  // trigger comment scraping
  const scrapeComments = data.map((item) => ({
    url: item.url,
    load_replies: 1,
    num_of_comments: 10,
    sort_by: "Top comments",
  }));

  const res = await supabase.functions.invoke("trigger_collection_api", {
    body: {
      dataset_id: YOUTUBE_COMMENTS,
      input: scrapeComments,
    },
  });
  console.log("Trigger collection api response:", res);
}

async function saveYoutubeComments(
  supabase: SupabaseClient,
  data: any,
  snapshot_id: string,
) {
  const res = await supabase.from("yt_comments").upsert(data.map((item) => ({
    id: item.comment_id,
    content: item.comment_text,
    replies: item.replies_value?.map((r) => r.reply_text) ?? [],
    video_id: item.video_id,
  })));
  console.log("Insert comments response:", res);

  await supabase.from("scrape_jobs").update({
    status: "ready",
  }).eq("id", snapshot_id);
}

Deno.serve(async (req) => {
  const data = await req.json();
  const snapshot_id = req.headers.get("snapshot-id");

  if (!snapshot_id) {
    return new Response(
      JSON.stringify({ status: "error", message: "Snapshot ID is required" }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  console.log("Data: ", data);
  console.log("Snapshot ID: ", snapshot_id);

  // supa client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  // fetch scrape job
  const { data: scrapeJob } = await supabase.from("scrape_jobs").select("*").eq(
    "id",
    snapshot_id,
  ).single();

  if (!scrapeJob) {
    console.error("Scrape job not found");
    return new Response(
      JSON.stringify({ status: "error", message: "Scrape job not found" }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (scrapeJob.dataset_id === YT_CHANNELS_DATASET_ID) {
    console.log("Saving channel data");
    await saveChannel(supabase, data, snapshot_id);
  } else if (scrapeJob.dataset_id === YT_VIDEOS_DATASET_ID) {
    console.log("Saving video data");
    await saveVideos(supabase, data, snapshot_id);
  } else if (scrapeJob.dataset_id === YOUTUBE_COMMENTS) {
    await saveYoutubeComments(supabase, data, snapshot_id);
  }

  return new Response(
    JSON.stringify({ status: "ok" }),
    { headers: { "Content-Type": "application/json" } },
  );
});

// // supa client
// const supabase = createClient(
//   Deno.env.get("SUPABASE_URL") ?? "",
//   Deno.env.get("SUPABASE_ANON_KEY") ?? "",
//   {
//     global: { headers: { Authorization: req.headers.get("Authorization")! } },
//   },
// );
// Deno.serve(async (req) => {
//   const data = await req.json();
//   const snapshot_id = req.headers.get("snapshot-id")!;

//   // fetch scrape job
//   const { data: scrapeJob } = await supabase.from("scrape_jobs").select("*").eq(
//     "id",
//     snapshot_id,
//   ).single();

//   switch (scrapeJob.dataset_id) {
//     case YT_CHANNELS_DATASET_ID:
//       await saveChannel(supabase, data, snapshot_id);
//       break;

//     case YT_VIDEOS_DATASET_ID:
//       await saveVideos(supabase, data, snapshot_id);
//       break;

//     case YOUTUBE_COMMENTS:
//       await saveYoutubeComments(supabase, data, snapshot_id);
//       break;

//       // other datasets (ex: instagram, tiktok, linkedin, etc)
//     default:
//       console.error("Unknown dataset ID");
//       break;
//   }
// });
