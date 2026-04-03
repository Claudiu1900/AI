import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert to File object for OpenAI
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], 'recording.webm', { type: audioFile.type });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    });

    return NextResponse.json({ text: transcription.text });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
