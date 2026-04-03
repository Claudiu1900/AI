import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { InferenceClient } from '@huggingface/inference';

// Use Qwen via OpenRouter to enhance the user's prompt into a detailed English image prompt
async function enhancePrompt(userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return userPrompt;

  try {
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    const completion = await openrouter.chat.completions.create({
      model: 'qwen/qwen3.6-plus:free',
      messages: [
        {
          role: 'system',
          content: `You are an expert image prompt engineer. The user will give you a description (possibly in any language). You must:
1. Translate it to English if needed
2. Expand it into a detailed, vivid image generation prompt (2-3 sentences max)
3. Add style details: lighting, composition, art style, colors, mood
4. Output ONLY the enhanced prompt text, nothing else. No explanations, no quotes.
Example input: "un cal" 
Example output: A majestic horse galloping through a golden meadow at sunset, powerful muscles rippling beneath a glossy chestnut coat, mane flowing in the wind, dramatic golden hour lighting with warm orange and amber tones, photorealistic style, 8K ultra detailed`
        },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim();
    // Remove any thinking tags if present
    const cleaned = enhanced?.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return cleaned || userPrompt;
  } catch (error) {
    console.error('Prompt enhancement failed, using original:', error.message);
    return userPrompt;
  }
}

export async function POST(req) {
  try {
    const { prompt, model, api_type } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // If using OpenAI with a valid key, use DALL-E
    if (api_type === 'openai' && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_')) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.images.generate({
        model: model || 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      const url = response.data[0]?.url;

      if (!url) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      return NextResponse.json({ url });
    }

    // HuggingFace FLUX.1-dev via HF Inference SDK
    if (api_type === 'huggingface' && process.env.HF_TOKEN && !process.env.HF_TOKEN.includes('your_')) {
      const enhancedPrompt = await enhancePrompt(prompt);
      console.log('HF Enhanced prompt:', enhancedPrompt);

      const hfModel = model || 'black-forest-labs/FLUX.1-dev';
      const client = new InferenceClient(process.env.HF_TOKEN);

      const imageBlob = await client.textToImage({
        model: hfModel,
        inputs: enhancedPrompt,
      });

      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      return NextResponse.json({ url: dataUrl });
    }

    // Step 1: Enhance prompt using AI (translate + add detail)
    const enhancedPrompt = await enhancePrompt(prompt);
    console.log('Enhanced prompt:', enhancedPrompt);

    // Step 2: Generate image with FLUX-2 via api.airforce (free, high quality)
    async function generateImage(enhancedPrompt, attempt = 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const imageApiResponse = await fetch('https://api.airforce/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          model: 'flux-2-dev',
          size: '1024x1024',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle rate limit - wait and retry once
      if (imageApiResponse.status === 429 && attempt === 1) {
        console.log('Rate limited, waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return generateImage(enhancedPrompt, 2);
      }

      if (!imageApiResponse.ok) {
        const errText = await imageApiResponse.text();
        throw new Error(errText);
      }

      const imageData = await imageApiResponse.json();
      return imageData.data?.[0]?.url;
    }

    const url = await generateImage(enhancedPrompt);

    if (!url) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    return NextResponse.json({ url });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}

// Allow up to 120 seconds for image generation
export const maxDuration = 120;
