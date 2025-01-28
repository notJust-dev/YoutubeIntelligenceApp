import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

Deno.serve(async (req) => {
  const { video_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  const { data: video } = await supabase.from("yt_videos").select("*")
    .eq("id", video_id).single();
  const { data: comments } = await supabase.from("yt_comments").select("*").eq(
    "video_id",
    video_id,
  );

  if (!video) {
    return new Response("Video not found", { status: 404 });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const chatCompletion = await openai.chat.completions.create({
    response_format: { type: "json_object" },
    messages: [{
      role: "developer",
      "content":
        "You are an AI assistant specialized in analyzing YouTube comments. Your task is to determine the overall sentiment and extract common topics discussed in the comments. Provide the output in JSON format.",
    }, {
      role: "user",
      "content": `Here are the comments for a YouTube video: 
        ${comments.map((comment) => `- ${comment.content}`).join("\n")}
        Please analyze these comments and provide the following in JSON format:
        {
          sentiment: "positive" | "negative" | "neutral",
          sentiment_score: number, // 0-1
          sentiment_explanation: string, // A brief explanation of the sentiment
          topics: string[], //A list of common topics discussed
        }
    `,
    }],
    // Choose model from here: https://platform.openai.com/docs/models
    model: "gpt-4o-mini",
    stream: false,
  });

  const reply = chatCompletion.choices[0].message.content;
  const parsedReply = JSON.parse(reply);

  const { data, error } = await supabase.from("yt_videos").update({
    comments_sentiment: parsedReply.sentiment,
    comments_sentiment_score: parsedReply.sentiment_score,
    comments_sentiment_explanation: parsedReply.sentiment_explanation,
    comments_topics: parsedReply.topics,
  }).eq("id", video_id);

  return new Response(
    JSON.stringify(reply),
    { headers: { "Content-Type": "application/json" } },
  );
});
