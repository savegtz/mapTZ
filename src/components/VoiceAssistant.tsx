import React, { useState, useEffect, useRef } from "react";
import { Mic, MessageSquare, Send, Volume2, VolumeX, Sparkles, User, Bot, AlertTriangle, RefreshCw } from "lucide-react";
import { ChatMessage, LocationPin } from "../types";

interface VoiceAssistantProps {
  currentGPS: { lat: number; lng: number } | null;
  selectedPin: LocationPin | null;
  userLanguage: "sw" | "en";
}

export default function VoiceAssistant({ currentGPS, selectedPin, userLanguage }: VoiceAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Cleanup speech synthesis & recognition on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore already stopped error
        }
      }
    };
  }, []);

  // Initial greeting
  useEffect(() => {
    const greetingText = userLanguage === "sw" 
      ? "Habari gani! Mimi ni msaidizi wako wa safari ya AR. Unaweza kuniuliza msaada wowote au kupata maelekezo ya sauti."
      : "Hello! I am your AR journey co-pilot. Ask me for directions or help navigating your surroundings.";
    
    setMessages([
      {
        id: "greet",
        role: "model",
        text: greetingText,
        timestamp: Date.now(),
      },
    ]);

    if (voicePlayback) {
      speak(greetingText);
    }
  }, [userLanguage]);

  // Scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!voicePlayback || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = userLanguage === "sw" ? "sw-TZ" : "en-US";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text) return;

    if (!textToSend) setInputText("");

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text,
          })),
          context: {
            currentGPS,
            selectedPin: selectedPin ? {
              name: selectedPin.name,
              lat: selectedPin.latitude,
              lng: selectedPin.longitude,
              desc: selectedPin.description
            } : null,
            userLanguage,
          },
        }),
      });

      const data = await response.json();
      if (data.text) {
        const botMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "model",
          text: data.text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
        speak(data.text);
      } else {
        throw new Error(data.error || "No response received");
      }
    } catch (err: any) {
      console.error("Gemini Assistant error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: userLanguage === "sw" 
            ? "Samahani, nimeshindwa kuwasiliana na mfumo wa Gemini kwa sasa. Tafadhali jaribu tena."
            : "Sorry, I couldn't connect with the Gemini AI services. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API Microphone Simulator / Trigger
  const handleToggleVoiceRecord = () => {
    if (!("webkitSpeechRecognition" in window) && !("speechRecognition" in window)) {
      alert("Utambuzi wa sauti haukubaliwi kwenye kivinjari hiki (Web Speech Recognition not supported in this browser). Tafadhali andika ujumbe.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
      }
      setIsRecording(false);
    } else {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = userLanguage === "sw" ? "sw-TZ" : "en-US";
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          setIsRecording(false);
          handleSend(resultText);
        };

        recognition.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setIsRecording(false);
          if (err.error === "not-allowed") {
            alert(userLanguage === "sw" 
              ? "Ruhusa ya maikrofoni imekataliwa au haipatikani kwenye kivinjari/iframe hii."
              : "Microphone permission is denied or not supported in this browser/iframe context."
            );
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
        };

        recognition.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col h-[480px] overflow-hidden" id="gemini-assistant-panel">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-sm tracking-tight">Gemini Voice Navigator</h3>
            <span className="text-[10px] text-slate-500 font-medium">Co-pilot ya Sauti (AI Copilot)</span>
          </div>
        </div>

        {/* Audio Output Selector */}
        <button
          onClick={() => setVoicePlayback(!voicePlayback)}
          className={`p-2 rounded-xl transition-all border ${
            voicePlayback 
              ? "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-2xs" 
              : "bg-white border border-slate-200 text-slate-400 hover:text-slate-700 shadow-2xs"
          }`}
          title={voicePlayback ? "Mute Gemini Voice" : "Enable Gemini Voice"}
        >
          {voicePlayback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar pb-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role !== "user" && (
              <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 self-start">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none font-medium shadow-2xs"
                  : "bg-slate-50 border border-slate-150 text-slate-700 rounded-tl-none"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 self-start">
                <User className="w-4 h-4 text-indigo-700" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
            </div>
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 italic">
              Gemini anafikiri (Thinking)...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Sound Wave visualizer if recording */}
      {isRecording && (
        <div className="flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl mb-3 animate-pulse">
          <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">Inasikiliza sauti... (Listening)</span>
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 h-1.5 bg-indigo-500 rounded animate-[bounce_1s_infinite_100ms]"></span>
            <span className="w-0.5 h-3 bg-indigo-500 rounded animate-[bounce_1s_infinite_200ms]"></span>
            <span className="w-0.5 h-2 bg-indigo-500 rounded animate-[bounce_1s_infinite_300ms]"></span>
            <span className="w-0.5 h-3.5 bg-indigo-500 rounded animate-[bounce_1s_infinite_150ms]"></span>
          </div>
        </div>
      )}

      {/* Inputs panel */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={handleToggleVoiceRecord}
          className={`p-3 rounded-xl transition-all border ${
            isRecording
              ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
              : "bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 border-slate-200 shadow-2xs"
          }`}
          title="Speak to Gemini"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          placeholder={userLanguage === "sw" ? "Andika swali lako hapa..." : "Type your question here..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all active:scale-95 shadow-2xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
