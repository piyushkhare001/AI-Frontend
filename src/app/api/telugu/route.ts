import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient();

export async function POST(request: Request) {
  try {
    const { text, language } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { 
        languageCode: language || 'hi-IN', // Default to Hindi
        ssmlGender: 'FEMALE' 
      },
      audioConfig: { audioEncoding: 'MP3' },
    });

    // Convert audioContent to a Buffer for the Response body
    const audioBuffer = response.audioContent
      ? Buffer.from(response.audioContent)
      : Buffer.alloc(0);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech failed' },
      { status: 500 }
    );
  }
}

