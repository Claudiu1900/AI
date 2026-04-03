import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { messages, model, api_type, system_prompt, max_tokens, temperature } = await req.json();

    if (!messages || !model || !api_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let content = '';
    let tokens = 0;

    if (api_type === 'openai') {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const openaiMessages = [
        { role: 'system', content: system_prompt || 'You are a helpful AI assistant.' },
      ];

      for (const msg of messages) {
        if (msg.image_url && msg.role === 'user') {
          openaiMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'What do you see in this image?' },
              { type: 'image_url', image_url: { url: msg.image_url } },
            ],
          });
        } else {
          openaiMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const completion = await openai.chat.completions.create({
        model,
        messages: openaiMessages,
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0.7,
      });

      content = completion.choices[0]?.message?.content || '';
      tokens = completion.usage?.total_tokens || 0;

    } else if (api_type === 'gemini') {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model });

      const geminiHistory = [];
      let lastUserContent = '';

      // Build Gemini chat history
      for (let i = 0; i < messages.length - 1; i++) {
        const msg = messages[i];
        geminiHistory.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }

      const lastMsg = messages[messages.length - 1];

      if (lastMsg.image_url) {
        // For image messages, use generateContent directly
        const base64Match = lastMsg.image_url.match(/^data:(.+);base64,(.+)$/);
        if (base64Match) {
          const result = await geminiModel.generateContent([
            lastMsg.content || 'What do you see in this image?',
            {
              inlineData: {
                mimeType: base64Match[1],
                data: base64Match[2],
              },
            },
          ]);
          content = result.response.text();
        }
      } else {
        const chat = geminiModel.startChat({
          history: geminiHistory,
          generationConfig: {
            maxOutputTokens: max_tokens || 4096,
            temperature: temperature || 0.7,
          },
        });

        const result = await chat.sendMessage(
          (system_prompt ? system_prompt + '\n\n' : '') + lastMsg.content
        );
        content = result.response.text();
      }
    } else if (api_type === 'openrouter') {
      const openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const orMessages = [
        { role: 'system', content: system_prompt || 'You are a helpful AI assistant.' },
      ];

      for (const msg of messages) {
        if (msg.image_url && msg.role === 'user') {
          orMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'What do you see in this image?' },
              { type: 'image_url', image_url: { url: msg.image_url } },
            ],
          });
        } else {
          orMessages.push({ role: msg.role, content: msg.content });
        }
      }

      const completion = await openrouter.chat.completions.create({
        model,
        messages: orMessages,
        max_tokens: max_tokens || 4096,
        temperature: temperature || 0.7,
      });

      content = completion.choices[0]?.message?.content || '';
      tokens = completion.usage?.total_tokens || 0;

    } else {
      return NextResponse.json({ error: 'Unsupported API type' }, { status: 400 });
    }

    return NextResponse.json({ content, tokens });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
