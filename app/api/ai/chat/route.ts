import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { orchestrateRequest } from "@/lib/ai/orchestrator";
import { createStreamResponse } from "@/lib/ai/stream";
import { getConversationContext } from "@/lib/ai/memory";
import { aiQueue } from "@/lib/openrouter/requestQueue";
import { getCachedResponse, setCachedResponse, generateCacheKey } from "@/lib/openrouter/cache";

export const maxDuration = 55; // Vercel limit

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, prompt, imagesBase64, fileContext, subject = "general", mode = "chat", preferences } = body;

    if (!prompt && (!imagesBase64 || imagesBase64.length === 0)) {
      return new Response(JSON.stringify({ error: "Missing prompt or images" }), { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isGuest = !user;
    const userId = user ? user.id : "guest";

    // 1. Fetch History
    const { messages, profileName, profileBio, summaryPrompt } = await getConversationContext(chatId, isGuest);

    // 2. Short cache check (only for very basic identical requests without history)
    const isSimpleCacheable = isGuest && !fileContext && !imagesBase64?.length && messages.length === 0;
    if (isSimpleCacheable) {
      const cacheKey = generateCacheKey("deepseek/deepseek-v4-flash:free", subject, prompt);
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // 3. Setup context params
    const contextParams = {
      messages,
      subject,
      mode,
      profileName,
      profileBio,
      preferences,
      fileContext,
      prompt
    };

    // 4. Queue and Orchestrate
    const { response, modelUsed } = await aiQueue.schedule(() => 
      orchestrateRequest(contextParams, req.signal)
    );

    // 5. Create Stream
    return await createStreamResponse(
      chatId,
      prompt,
      response,
      modelUsed,
      userId,
      isGuest
    );

  } catch (error: any) {
    console.error("AI API Error:", error);
    
    if (error.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Request aborted" }), { status: 499 });
    }

    return new Response(
      JSON.stringify({ error: error.message || "Tất cả máy chủ AI đều đang bận. Vui lòng thử lại sau." }), 
      { status: 500 }
    );
  }
}
