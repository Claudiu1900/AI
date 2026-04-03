import { NextResponse } from 'next/server';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
    const { prompt, model } = await req.json();
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!apiKey || apiKey.includes('your_')) {
      return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 });
    }

    // Enhance prompt
    const enhancedPrompt = await enhanceVideoPrompt(prompt);
    console.log('Video enhanced prompt:', enhancedPrompt);

    const veoModel = model || 'veo-3.1-generate-preview';

    // Step 1: Start video generation (async operation)
    const generateRes = await fetch(
      `${GEMINI_API_BASE}/models/${veoModel}:predictLongRunning?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: enhancedPrompt }],
          parameters: {
            aspectRatio: '16:9',
            personGeneration: 'allow_all',
          },
        }),
      }
    );

    if (!generateRes.ok) {
      const errText = await generateRes.text();
      console.error('Veo generate error:', generateRes.status, errText);
      return NextResponse.json({ error: `Video generation failed: ${generateRes.status}` }, { status: 500 });
    }

    const operation = await generateRes.json();
    const operationName = operation.name;

    if (!operationName) {
      return NextResponse.json({ error: 'No operation returned from Veo' }, { status: 500 });
    }

    // Step 2: Poll for completion (max ~5 minutes)
    let result = null;
    const maxAttempts = 60; // 60 * 5s = 5 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(
        `${GEMINI_API_BASE}/operations/${operationName}?key=${apiKey}`
      );

      if (!pollRes.ok) {
        const errText = await pollRes.text();
        console.error('Poll error:', pollRes.status, errText);
        continue;
      }

      const pollData = await pollRes.json();

      if (pollData.done) {
        result = pollData;
        break;
      }

      console.log(`Video generation polling... attempt ${i + 1}/${maxAttempts}`);
    }

    if (!result) {
      return NextResponse.json({ error: 'Video generation timed out' }, { status: 504 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message || 'Video generation failed' }, { status: 500 });
    }

    // Step 3: Get video URL from result
    const generatedVideos = result.response?.generateVideoResponse?.generatedSamples
      || result.response?.generatedVideos
      || result.metadata?.generatedVideos;

    if (!generatedVideos || generatedVideos.length === 0) {
      // Try alternative response formats
      const video = result.response?.predictions?.[0];
      if (video?.video?.uri) {
        return NextResponse.json({ url: video.video.uri });
      }
      console.error('No video in response:', JSON.stringify(result).slice(0, 500));
      return NextResponse.json({ error: 'No video generated' }, { status: 500 });
    }

    const videoUri = generatedVideos[0]?.video?.uri || generatedVideos[0]?.uri;

    if (!videoUri) {
      console.error('No video URI found:', JSON.stringify(generatedVideos[0]).slice(0, 300));
      return NextResponse.json({ error: 'No video URL in response' }, { status: 500 });
    }

    // Download the video and convert to base64 data URI
    const videoDownload = await fetch(`${videoUri}?key=${apiKey}`);
    if (!videoDownload.ok) {
      // If direct download fails, return the URI as-is (user can try direct)
      return NextResponse.json({ url: videoUri });
    }

    const videoBuffer = await videoDownload.arrayBuffer();
    const base64 = Buffer.from(videoBuffer).toString('base64');
    const dataUrl = `data:video/mp4;base64,${base64}`;

    return NextResponse.json({ url: dataUrl });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
