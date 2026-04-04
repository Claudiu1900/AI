'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoiceRecorder({ onTranscription, disabled }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const [useBrowserSpeech] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  const startRecording = async () => {
    if (useBrowserSpeech) {
      try {
        startBrowserSpeech();
      } catch (err) {
        console.error('Browser speech failed, trying mic fallback:', err);
        await startMicRecording();
      }
      return;
    }
    await startMicRecording();
  };

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone access denied. Check browser permissions.');
    }
  };

  const startBrowserSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'ro-RO';

    let finalTranscript = '';
    let hasResult = false;

    recognition.onresult = (event) => {
      hasResult = true;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
    };

    recognition.onend = () => {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current = null;
      if (finalTranscript.trim()) {
        onTranscription(finalTranscript.trim());
        toast.success('Voice captured!');
      } else if (!hasResult) {
        toast.error('No speech detected. Try speaking louder or closer to the mic.');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current = null;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error('Microphone permission denied');
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected. Try again.');
      } else if (event.error !== 'aborted') {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      toast('Listening... Speak now', { icon: '🎙️', duration: 2000 });
    } catch (err) {
      console.error('Failed to start recognition:', err);
      toast.error('Failed to start voice recognition');
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && recording) {
      try { recognitionRef.current.stop(); } catch {}
      // onend handler will clean up state
      return;
    }

    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.text) {
        onTranscription(data.text);
      } else if (data.error) {
        console.error('Transcription error:', data.error);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    }
    setProcessing(false);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center">
      <AnimatePresence mode="wait">
        {processing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs text-indigo-400">Transcribing...</span>
          </motion.div>
        ) : recording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-3"
          >
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-mono">{formatDuration(duration)}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopRecording}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all recording-pulse"
              title="Stop recording"
            >
              <Square className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startRecording}
            disabled={disabled}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-indigo-400 transition-all disabled:opacity-30"
            title="Record voice message"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
