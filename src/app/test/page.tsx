/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [status, setStatus] = useState('🔈 Click to Start Speaking');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [targetLang, setTargetLang] = useState<'en' | 'te'>('en');

  const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyDkV7a7gzy4kHw2jR01_mYnH-dvwKgaFxg'; // Your API key

  // Load system voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  // Load ResponsiveVoice.js dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=qb8FeKrv';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const speakText = (text: string, langCode: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const matchedVoice = voices.find((v) => v.lang.startsWith(langCode));

    if (matchedVoice && langCode !== 'te-IN') {
      // Use system TTS for English
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = matchedVoice;
      utterance.lang = langCode;
      utterance.rate = 0.9;
      synth.speak(utterance);
    } else if (langCode === 'te-IN' && (window as any).responsiveVoice) {
      // Use ResponsiveVoice.js for Telugu
      (window as any).responsiveVoice.speak(text, 'Telugu Female');
    } else {
      alert(`No suitable voice found for ${langCode}`);
    }
  };

  const translateText = async (text: string, sourceLang: string, targetLang: string) => {
    try {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text',
          }),
        }
      );
      const data = await res.json();
      return data.data?.translations?.[0]?.translatedText || 'Translation failed';
    } catch (err) {
      console.error('Translation Error:', err);
      return 'Translation failed';
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('❌ Your browser does not support voice input.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'te-IN'; // Changed from 'hi-IN' to 'te-IN' for Telugu
    recognition.interimResults = false;

    setStatus('🎙️ Listening...');
    recognition.start();

    recognition.onresult = async (event: any) => {
      const userSpeech = event.results[0][0].transcript;
      setTranscript(userSpeech);
      console.log('🎤 You said (Telugu):', userSpeech);

      const translated = await translateText(userSpeech, 'te', targetLang);
      setTranslatedText(translated);
      console.log(`🌐 Translated (${targetLang}):`, translated);

      const langCode = targetLang === 'en' ? 'en-US' : 'te-IN';
      setStatus('🗣️ Speaking...');
      speakText(translated, langCode);
      setStatus('✅ Spoke translation');
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setStatus('⚠️ Error occurred, try again.');
    };
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">🎧 Telugu to Voice Translator</h1>

      <div className="flex gap-2">
        <button
          onClick={handleVoiceInput}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          {status}
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value as 'en' | 'te')}
          className="bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded"
        >
          <option value="en">Translate to English</option>
          <option value="te">Translate to Telugu</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        <p><strong>🧑‍💬 You Said (Telugu):</strong> {transcript}</p>
        <p><strong>🌐 Translated:</strong> {translatedText}</p>
      </div>

      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-2">🛠 Debug Info</h2>
        <p><strong>Available Voices:</strong> {voices.length}</p>
        <ul className="text-sm max-h-40 overflow-y-auto">
          {voices.map((v, i) => (
            <li key={i}>{v.name} ({v.lang})</li>
          ))}
        </ul>
      </div>
    </div>
  );
}