import { NextResponse } from 'next/server';

const VEO_API_BASE = 'https://veo3api.com';

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
    const envVar = api_key_env || 'VEO3_API_KEY';
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

    const veoModel = model || 'veo-3.1';

    // Step 1: Start video generation
    const generateRes = await fetch(`${VEO_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        model: veoModel,
        aspect_ratio: '16:9',
        watermark: null,
      }),
    });

    if (!generateRes.ok) {
      const errText = await generateRes.text();
      console.error('Veo generate error:', generateRes.status, errText);
      return NextResponse.json({ error: `Video generation failed: ${generateRes.status}` }, { status: 500 });
    }

    const generateData = await generateRes.json();

    if (generateData.code !== 200 || !generateData.data?.task_id) {
      return NextResponse.json({ error: generateData.message || 'No task ID returned' }, { status: 500 });
    }

    const taskId = generateData.data.task_id;
    console.log('Video task started:', taskId);

    // Step 2: Poll for completion (max ~5 minutes)
    let videoUrl = null;
    const maxAttempts = 60; // 60 * 5s = 5 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await fetch(`${VEO_API_BASE}/feed?task_id=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!pollRes.ok) {
        console.error('Poll error:', pollRes.status);
        continue;
      }

      const pollData = await pollRes.json();

      if (pollData.data?.status === 'COMPLETED') {
        const urls = pollData.data?.response;
        if (urls && urls.length > 0) {
          videoUrl = urls[0];
        }
        break;
      }

      if (pollData.data?.status === 'FAILED') {
        return NextResponse.json({ error: 'Video generation failed' }, { status: 500 });
      }

      console.log(`Video polling... attempt ${i + 1}/${maxAttempts}, status: ${pollData.data?.status}`);
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'Video generation timed out' }, { status: 504 });
    }

    // Step 3: Try to get 1080p version (free)
    try {
      const hdRes = await fetch(`${VEO_API_BASE}/get-1080p?task_id=${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (hdRes.ok) {
        const hdData = await hdRes.json();
        if (hdData.data?.result_url) {
          videoUrl = hdData.data.result_url;
        }
      }
    } catch {
      // 1080p upgrade failed, use original URL
    }

    return NextResponse.json({ url: videoUrl });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Video generation failed' },
      { status: 500 }
    );
  }
}
