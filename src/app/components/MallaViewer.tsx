/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform , animate} from 'framer-motion';
import mallaTelling from '../../../public/malla-360/malla-telling.gif';

const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyDkV7a7gzy4kHw2jR01_mYnH-dvwKgaFxg';
const API_ENDPOINT = 'https://45ae-183-83-53-125.ngrok-free.app/ask';
const ELEVENLABS_VOICE_ID = 'HRfQ3Nt65DnCOZWLdMGo';
const ELEVENLABS_API_KEY  = 'sk_129ed5ef6086cf235a30e83d966a9e83df43d3659b5e0add';

// Extend the Window interface to include SpeechRecognition types
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}



export default function MallaViewer() {
  const total = 8;
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [apiResponse, setApiResponse] = useState('');
  const [inputText, setInputText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const lastIndex = useRef(0);

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined;

let recognition: InstanceType<typeof SpeechRecognition> | null = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'te-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
}

  const motionIndex = useMotionValue(0);
  const roundedIndex = useTransform(motionIndex, (value) => Math.round(value) % total);

  const bgX = useMotionValue(0);
  const bgY = useMotionValue(0);
  const lightX = useMotionValue(0);
  const lightY = useMotionValue(0);
  const shadowX = useTransform(roundedIndex, [0, total], [-15, 15]);

  useEffect(() => {
    const animateBackground = () => {
      animate(bgX, [0, 100, 0], {
        duration: 40,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "linear",
      });
      animate(bgY, [0, 50, 0], {
        duration: 55,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "linear",
        delay: 15,
      });
      animate(lightX, [-20, 20, -20], {
        duration: 25,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      });
      animate(lightY, [-10, 10, -10], {
        duration: 30,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay: 10,
      });
    };
    animateBackground();
  }, []);

  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = Array.from({ length: 8 }, (_, i) => {
        const imgNum = 101 + i;
        return new Promise<string>((resolve) => {
          const img = new Image();
          img.src = `/malla-360/img_${imgNum}.png`;
          img.onload = () => resolve(img.src);
        });
      });
      const loadedImages = await Promise.all(imagePromises);
      setImages(loadedImages);
      setLoaded(true);
    };
    loadImages();
  }, []);

  useEffect(() => {
    const unsubscribe = roundedIndex.onChange((value) => {
      const positiveIndex = value < 0 ? value + total : value;
      setIndex(positiveIndex);
    });
    return () => unsubscribe();
  }, [total]);

  const translateText = async (text: string, targetLang: string) => {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, target: targetLang }),
        }
      );
      const data = await response.json();
      return data.data.translations[0].translatedText;
    } catch (error) {
      return text;
    }
  };

  const callAskAPI = async (question: string) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question }),
      });
      const data = await response.json();
      console.log('API Response:', data);
      return data.answer || data.response || "Sorry, I couldn't process your request.";
    } catch (error) {
      return "Sorry, I couldn't process your request.";
    }
  };

const slowDownText = (text: string) =>
  text.replace(/([,\.!?])/g, '$1...').replace(/\s+/g, '  '); // doubles spaces and adds pauses

const speakWithClonedVoice = async (text: string) => {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: slowDownText(text),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.onplay = () => setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => setSpeaking(false);
    audio.play();
  } catch (error) {
    setSpeaking(false);
  }
};

const handleVoiceSubmit = async (spokenText: string) => {
  if (!spokenText.trim()) return;
  setUserQuestion(spokenText);
  try {
    const englishQuestion = await translateText(spokenText, 'en');
    const apiAnswer = await callAskAPI(englishQuestion);
    setApiResponse(apiAnswer);
    const teluguResponse = await translateText(apiAnswer, 'te');
    await speakWithClonedVoice(teluguResponse);
  } catch (error) {
    setSpeaking(false);
  }
};

  const startListening = () => {
    if (!recognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    recognition.start();
    recognition.onresult = async (event : any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      await handleVoiceSubmit(transcript);
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    lastIndex.current = index;
    document.body.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const framesDragged = delta / 3;
    const newIndex = (lastIndex.current - framesDragged / 15) % total;
    motionIndex.set(newIndex);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.style.cursor = '';
    const current = motionIndex.get();
    const target = Math.round(current);
    animate(motionIndex, target, {
      type: "spring",
      stiffness: 200,
      damping: 25,
      mass: 0.5,
    });
  };

  const imgNum = 101 + index;
  const imageUrl = `/malla-360/img_${imgNum}.png`;

  return (
    <div className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
  {/* Enhanced animated background with parallax effect */}
  <motion.div 
    className="absolute inset-0 -z-10"
    style={{
      background: `
        radial-gradient(circle at 30% 50%, rgba(30, 30, 40, 0.9) 0%, rgba(10, 10, 20, 1) 100%),
        linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)
      `,
      x: bgX.get() * 0.5,
      y: bgY.get() * 0.5,
    }}
  />
  
  {/* Improved floating particles with better depth perception */}
  <div className="absolute inset-0 overflow-hidden opacity-40">
    {Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 4 + 1;
      const depth = Math.random();
      const color = `hsl(${Math.random() * 60 + 200}, 80%, 70%)`;
      return (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            backgroundColor: color,
            width: `${size}px`,
            height: `${size}px`,
          }}
          initial={{
            x: Math.random() * 100,
            y: Math.random() * 100,
            opacity: 0.4 * depth,
          }}
          animate={{
            y: [0, 150 * (1 + depth), 0],
            x: [0, 80 * (1 + depth), 0],
            opacity: [0.4 * depth, 0.9 * depth, 0.4 * depth],
          }}
          transition={{
            duration: Math.random() * 50 + 30,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 15,
          }}
        />
      );
    })}
  </div>

  {/* Dynamic lighting with gradient */}
  <motion.div 
    className="absolute inset-0 pointer-events-none opacity-70"
    style={{
      background: `radial-gradient(
        circle at ${lightX}px ${lightY}px,
        rgba(100, 150, 255, 0.15) 0%,
        transparent 80%
      )`,
    }}
  />

  {/* Main content container */}
  <div className="max-w-4xl w-full flex flex-col items-center relative z-10 space-y-8">
    {/* Improved microphone button with animation */}
    <motion.div 
      className="w-full max-w-md flex justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <button
        type="button"
        onClick={startListening}
        disabled={speaking}
        className={`px-8 py-3 rounded-full text-white font-semibold shadow-lg transition-all duration-300 flex items-center gap-2
          ${speaking 
            ? 'bg-pink-600 shadow-pink-500/30 animate-pulse' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-500/30'}
        `}
      >
        <span className="text-xl">{speaking ? '' : '🎙️ Speak'}</span>
        {speaking && (
          <motion.span 
            className="h-2 w-2 bg-white rounded-full"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </button>
    </motion.div>
    
    {/* Enhanced 360 viewer with glow effect */}
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, type: 'spring' }}
    >
      {/* Refined circular platform shadow */}
      <motion.div 
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-8 rounded-full bg-black/40 blur-xl"
        style={{
          x: shadowX,
          scale: 1 - Math.abs(shadowX.get()) * 0.001,
        }}
        animate={{
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
        }}
      />
      
      {/* Viewer container with improved interactions */}
      <motion.div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="relative rounded-full overflow-hidden border-4 border-white/20 backdrop-blur-sm"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98, cursor: 'grabbing' }}
        style={{
          cursor: 'grab',
          width: '420px',
          height: '420px',
          boxShadow: '0 0 30px rgba(100, 150, 255, 0.3)',
        }}
      >
        <motion.img
          src={speaking ? (typeof mallaTelling === 'string' ? mallaTelling : mallaTelling.src) : imageUrl}
          alt="360 viewer"
          draggable={false}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          key={imgNum}
          style={{
            filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.3))',
          }}
        />
        
        {/* Inner glow effect */}
        <div className="absolute inset-0 rounded-full pointer-events-none" 
          style={{
            boxShadow: 'inset 0 0 30px rgba(255,255,255,0.1)',
          }}
        />
      </motion.div>
      
      {/* Subtle outer ring */}
      <motion.div 
        className="absolute inset-0 rounded-full border-2 border-white/5 pointer-events-none"
        style={{
          width: 'calc(100% + 20px)',
          height: 'calc(100% + 20px)',
          top: '-10px',
          left: '-10px',
        }}
      />
    </motion.div>
    
    {/* Status indicator */}
    {speaking && (
      <motion.div 
        className="mt-4 px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-sm font-medium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Listening...
      </motion.div>
    )}
  </div>
</div>
  );
}
