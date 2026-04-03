import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Allow long-running video generation (Vercel Pro: up to 300s)
export const maxDuration = 300;

// Enhance the user prompt for cinematic video generation
async function enhanceVideoPrompt(userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return userPrompt;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-plus:free',
        messages: [
          {
            role: 'system',
            content: `You are an expert video prompt engineer for Veo 3.1. The user will give you a description (possibly in any language). You must:
1. Translate it to English if needed
2. Expand it into a vivid, cinematic video prompt (3-4 sentences max)
3. Include: camera motion (dolly, tracking, aerial), lighting, mood, composition, style
4. Add sound/audio cues when relevant (ambient sounds, music style)
5. Output ONLY the enhanced prompt text, nothing else. No explanations, no quotes.
Example input: "o cursa de masini"
Example output: A thrilling high-speed car race through a neon-lit cityscape at night, multiple sports cars jostling for position as they drift around tight corners. The camera starts with an aerial tracking shot then cuts to a low-angle ground-level view capturing tire smoke and sparks. Engines roaring, tires screeching against wet asphalt, crowd cheering in the distance. Cinematic, high energy, dramatic lighting with neon reflections on rain-slicked streets.`
          },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();
    const cleaned = enhanced?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return cleaned || userPrompt;
  } catch {
    return userPrompt;
  }
}

export async function POST(req) {
  try {
    const { prompt, model, api_key_env } = await req.json();
    const envVar = api_key_env || 'GOOGLE_GEMINI_API_KEY';
    const apiKey = process.env[envVar];

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!apiKey || apiKey.includes('your_')) {
      return NextResponse.json({ error: `API key not configured (env: ${envVar})` }, { status: 500 });
    }

    // Enhance prompt
    const enhancedPrompt = await enhanceVideoPrompt(prompt);
    console.log('Video enhanced prompt:', enhancedPrompt);

    // Init Google GenAI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Start video generation
    let operation = await ai.models.generateVideos({
      model: model || 'veo-3.1-generate-preview',
      prompt: enhancedPrompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: '16:9',
        personGeneration: 'allow_all',
      },
    });

    // Poll for completion (max ~5 minutes)
    const maxAttempts = 30; // 30 * 10s = 5 minutes
    for (let i = 0; i < maxAttempts; i++) {
      if (operation.done) break;
      await new Promise(r => setTimeout(r, 10000));
      operation = await ai.operations.get({ operation });
      console.log(`Video polling... attempt ${i + 1}/${maxAttempts}`);
    }

    if (!operation.done) {
      return NextResponse.json({ error: 'Video generation timed out' }, { status: 504 });
    }

    const videos = operation.response?.generatedVideos;
    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'No video generated' }, { status: 500 });
    }

    // Extract video file reference
    const generatedVideo = videos[0];
    const fileName = generatedVideo.video?.name || generatedVideo.video?.uri;

    if (!fileName) {
      return NextResponse.json({ error: 'Could not get video file reference' }, { status: 500 });
    }

    // Return proxy URL (streams video through our server to avoid exposing API key)
    const fileId = fileName.startsWith('files/') ? fileName : `files/${fileName}`;
    const proxyUrl = `/api/video/stream?name=${encodeURIComponent(fileId)}`;
    return NextResponse.json({ url: proxyUrl });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
