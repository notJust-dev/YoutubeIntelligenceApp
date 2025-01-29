import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

Deno.serve(async (req) => {
  const { type, table, record: video } = await req.json();

  if (type !== "INSERT" || table !== "yt_videos") {
    return new Response("Invalid request", { status: 400 });
  }

  // supa client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    },
  );

  // Open AI
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Documentation here: https://github.com/openai/openai-node
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "developer",
        content: `
          You are an AI assistant specialized in analyzing and summarizing video transcripts. 
          Your task is to extract concise and meaningful summaries from the provided transcript. 
          Provide the output in JSON format.`,
      },
      {
        role: "user",
        content: `Here is the video transcript: 
          ${video.transcript}
          
          Please provide the summary and key topics in JSON format.
          {
            "ai_summary": string, // the summary of the video with the most important points
            "ai_topics": string[] // the key topics of the video (max 5)
          }
        `,
      },
    ],
    // Choose model from here: https://platform.openai.com/docs/models
    model: "gpt-4o-mini",
    stream: false,
    response_format: { type: "json_object" },
  });

  const reply = chatCompletion.choices[0].message.content;
  const jsonReply = JSON.parse(reply);

  // update the video with the summary and topics
  await supabase.from("yt_videos").update({
    ai_summary: jsonReply.ai_summary,
    ai_topics: jsonReply.ai_topics,
  }).eq("id", video.id);

  return new Response(reply, {
    headers: { "Content-Type": "text/plain" },
  });
});
