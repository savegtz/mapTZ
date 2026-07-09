import React, { useRef, useState, useEffect } from "react";
import { Camera, Compass, Navigation, ArrowUp, ArrowLeft, ArrowRight, RotateCw, Sparkles, Volume2, VolumeX, Landmark, ArrowDownLeft, Sliders, Play, Plus, Minus, Move } from "lucide-react";
import { LocationPin, NavState } from "../types";
import { calculateDistance, calculateBearing } from "../utils/geo";

interface ARCameraProps {
  targetPin: LocationPin;
  currentGPS: { lat: number; lng: number } | null;
  onClose: () => void;
  userLanguage: "sw" | "en";
}

export default function ARCamera({ targetPin, currentGPS, onClose, userLanguage }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Custom states for simulation
  const [simulatedLat, setSimulatedLat] = useState<number | null>(null);
  const [simulatedLng, setSimulatedLng] = useState<number | null>(null);
  const [simulatedHeading, setSimulatedHeading] = useState<number>(0); // manual compass heading fallback
  
  // Real GPS or Simulated GPS coordinates
  const activeLat = simulatedLat !== null ? simulatedLat : (currentGPS?.lat ?? -6.8180);
  const activeLng = simulatedLng !== null ? simulatedLng : (currentGPS?.lng ?? 39.2780);

  // Nav calculations
  const [navState, setNavState] = useState<NavState>({
    currentLat: activeLat,
    currentLng: activeLng,
    heading: simulatedHeading,
    distance: null,
    bearing: null,
    relativeAngle: null,
  });

  const [voiceGuideEnabled, setVoiceGuideEnabled] = useState(false);
  const [aiSpokenInstruction, setAiSpokenInstruction] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [permissionPromptNeeded, setPermissionPromptNeeded] = useState(false);

  // Start Camera Feed
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCameraAccess(true);
      } catch (err: any) {
        console.warn("Camera access denied or unavailable: ", err);
        setHasCameraAccess(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Listen to Device Orientation (Compass) if supported
  useEffect(() => {
    function handleOrientation(e: any) {
      // absolute heading in degrees, standard alpha sensor can be adjusted
      let heading = 0;
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading; // iOS support
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360; // Android/Web standard
      }
      
      // Update heading if absolute sensor is working
      if (heading !== 0) {
        setNavState((prev) => ({
          ...prev,
          heading: Math.round(heading),
        }));
      }
    }

    // Check if device needs permission on iOS
    if (
      typeof window !== "undefined" &&
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      setPermissionPromptNeeded(true);
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // Request Compass Permission on iOS
  const requestCompassPermission = async () => {
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === "granted") {
        setPermissionPromptNeeded(false);
        window.addEventListener(
          "deviceorientation",
          (e: any) => {
            let heading = 0;
            if (e.webkitCompassHeading !== undefined) {
              heading = e.webkitCompassHeading;
            } else if (e.alpha !== null) {
              heading = (360 - e.alpha) % 360;
            }
            if (heading !== 0) {
              setNavState((prev) => ({ ...prev, heading: Math.round(heading) }));
            }
          },
          true
        );
      }
    } catch (err) {
      console.error("Failed requesting compass permission: ", err);
    }
  };

  // Perform Geo calculations dynamically
  useEffect(() => {
    const distance = calculateDistance(activeLat, activeLng, targetPin.latitude, targetPin.longitude);
    const bearing = calculateBearing(activeLat, activeLng, targetPin.latitude, targetPin.longitude);

    // Compass heading defaults to manual if absolute is not detected/changing
    const headingToUse = navState.heading !== null && navState.heading !== 0 ? navState.heading : simulatedHeading;

    // Angle of target relative to user's heading
    // 0 means straight ahead, 90 means target is to the user's right, -90 left, 180 behind
    let relativeAngle = bearing - headingToUse;
    if (relativeAngle > 180) relativeAngle -= 360;
    if (relativeAngle < -180) relativeAngle += 360;

    setNavState({
      currentLat: activeLat,
      currentLng: activeLng,
      heading: headingToUse,
      distance: Math.round(distance * 10) / 10,
      bearing: Math.round(bearing),
      relativeAngle: Math.round(relativeAngle),
    });
  }, [activeLat, activeLng, targetPin, navState.heading, simulatedHeading]);

  // Handle Gemini AI Voice Prompts speaking out loud
  const speakVoiceGuide = (text: string) => {
    if ("speechSynthesis" in window) {
      // Cancel previous voices
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = userLanguage === "sw" ? "sw-TZ" : "en-US";
      utterance.rate = 0.95; // slightly slower for better clarity
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerGeminiAIInstruction = async () => {
    if (navState.distance === null || navState.bearing === null) return;
    setIsAiLoading(true);
    try {
      const response = await fetch("/api/voice-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: navState.distance,
          bearing: navState.bearing,
          directionText: targetPin.description,
          destName: targetPin.name,
          userLanguage: userLanguage,
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAiSpokenInstruction(data.text);
        if (voiceGuideEnabled) {
          speakVoiceGuide(data.text);
        }
      }
    } catch (err) {
      console.error("Failed to query Gemini API guide:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Run AI guidance every 12 seconds when close, or manually
  useEffect(() => {
    if (voiceGuideEnabled && navState.distance !== null) {
      triggerGeminiAIInstruction();
      const interval = setInterval(() => {
        triggerGeminiAIInstruction();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [voiceGuideEnabled, targetPin.id]);

  // Navigation simulation commands
  const simulateWalkCloser = () => {
    // Walk roughly 3-4 meters closer to destination lat/lng
    const currentDistance = navState.distance ?? 50;
    if (currentDistance <= 1.5) return; // arrived!
    
    // Lerp coordinates
    const ratio = 0.15; // 15% closer
    const newLat = activeLat + (targetPin.latitude - activeLat) * ratio;
    const newLng = activeLng + (targetPin.longitude - activeLng) * ratio;
    
    setSimulatedLat(Number(newLat.toFixed(6)));
    setSimulatedLng(Number(newLng.toFixed(6)));
  };

  const simulateWalkAway = () => {
    // Reverse step
    const ratio = -0.15;
    const newLat = activeLat + (targetPin.latitude - activeLat) * ratio;
    const newLng = activeLng + (targetPin.longitude - activeLng) * ratio;
    setSimulatedLat(Number(newLat.toFixed(6)));
    setSimulatedLng(Number(newLng.toFixed(6)));
  };

  const rotateCompass = (delta: number) => {
    setSimulatedHeading((prev) => (prev + delta + 360) % 360);
  };

  const arrived = (navState.distance !== null && navState.distance < 3);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden text-slate-900 font-sans" id="ar-viewer-container">
      {/* Dynamic 3D-ish Camera View */}
      <div className="relative flex-1 bg-slate-950">
        {hasCameraAccess ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950/40 flex flex-col items-center justify-center p-6 text-center">
            {/* Scenic Grid Backplane simulator */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-750/80 flex items-center justify-center mb-4 text-slate-400">
              <Camera className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-slate-200 text-lg">Kamera Imesimuliwa (Camera Simulated)</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-2 leading-relaxed">
              Kamera ya simu haipatikani kwenye kivinjari hiki, tumetengeneza mandhari ya simulizi ya AR.
            </p>
          </div>
        )}

        {/* Dynamic Holographic Overlay & Particle effects */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/95 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all active:scale-95 shadow-sm"
            >
              ← Nyuma (Close)
            </button>

            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-700 font-extrabold uppercase tracking-wider text-[10px]">GPS AR Active</span>
            </div>
          </div>

          {/* Core AR Arrow & HUD */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {arrived ? (
              /* ARRIVED BANNER */
              <div className="bg-white text-slate-900 font-extrabold p-6 rounded-3xl shadow-2xl border-4 border-emerald-500 backdrop-blur-lg flex flex-col items-center text-center animate-bounce max-w-sm pointer-events-auto">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl tracking-tight uppercase font-black text-emerald-700">Hongera, Umefika!</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">You have successfully arrived at:</p>
                <p className="text-lg font-black text-slate-900 mt-1.5">{targetPin.name}</p>
                {targetPin.description && (
                  <p className="text-[11px] bg-slate-50 p-2.5 rounded-xl mt-3 text-slate-600 leading-snug max-w-xs text-center border border-slate-100">
                    "{targetPin.description}"
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md"
                >
                  Funga (Close Nav)
                </button>
              </div>
            ) : (
              /* FLOATING AR ARROW & SENSORS HUD */
              <div className="flex flex-col items-center gap-5 pointer-events-auto">
                {/* 3D Arrow Container */}
                <div 
                  className="w-40 h-40 relative flex items-center justify-center transition-all duration-300"
                  style={{
                    transform: `perspective(500px) rotateX(45deg) rotateY(${navState.relativeAngle ?? 0}deg)`,
                  }}
                >
                  {/* Floating Pulsing Ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-teal-500/20 animate-spin-slow"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-teal-400/40 animate-ping opacity-35"></div>

                  {/* High-fidelity 3D Directional Arrow Pointer */}
                  <div className="w-24 h-24 relative flex items-center justify-center drop-shadow-[0_10px_15px_rgba(20,184,166,0.6)]">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full fill-current text-gradient animate-pulse"
                      style={{
                        transform: "rotate(0deg)", // rotation is fully handled by rotateY of parent projection
                      }}
                    >
                      <defs>
                        <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                      {/* Stylized sharp aerospace arrow */}
                      <path
                        d="M50,5 L85,90 L50,70 L15,90 Z"
                        fill="url(#arrowGradient)"
                        stroke="#0f766e"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>

                {/* Left/Right turn cues */}
                <div className="flex items-center justify-center gap-2">
                  {navState.relativeAngle !== null && (
                    <>
                      {navState.relativeAngle < -15 && (
                        <div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-900 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-extrabold animate-pulse backdrop-blur-md">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Geuka Kushoto {Math.abs(navState.relativeAngle)}°</span>
                        </div>
                      )}
                      {navState.relativeAngle > 15 && (
                        <div className="flex items-center gap-1.5 bg-amber-500/15 text-amber-900 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-extrabold animate-pulse backdrop-blur-md">
                          <span>Geuka Kulia {navState.relativeAngle}°</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                      {Math.abs(navState.relativeAngle) <= 15 && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-900 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-extrabold backdrop-blur-md">
                          <ArrowUp className="w-4 h-4 animate-bounce" />
                          <span>Nenda Moja kwa Moja! (Straight ahead)</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Navigation status box */}
                <div className="bg-white/95 border border-slate-200/80 rounded-2xl p-4 w-72 text-center backdrop-blur-md shadow-xl relative">
                  <span className="absolute -top-2 left-4 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-600 text-white">Target Destination</span>
                  <p className="text-sm font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    {targetPin.name}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Umbali (Distance)</span>
                      <span className="text-xl font-black text-slate-900">{navState.distance !== null ? `${navState.distance}m` : "Checking..."}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Mwelekeo (Bearing)</span>
                      <span className="text-xl font-black text-slate-900">{navState.bearing !== null ? `${navState.bearing}°` : "---"}</span>
                    </div>
                  </div>

                  {targetPin.description && (
                    <div className="mt-3 bg-slate-50/85 p-2.5 rounded-xl text-[11px] text-slate-600 italic text-left border border-slate-200/60 leading-relaxed">
                      📝 {targetPin.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Radar, Coordinates Tracker, & Manual Simulation panel */}
          <div className="pointer-events-auto flex flex-col gap-3">
            
            {/* Real-time Gemini Speech Box */}
            <div className="bg-white/95 border border-slate-200/80 p-3.5 rounded-2xl backdrop-blur-md flex items-center gap-3 shadow-xl">
              <button
                onClick={() => setVoiceGuideEnabled(!voiceGuideEnabled)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                  voiceGuideEnabled
                    ? "bg-indigo-50 border border-indigo-150 text-indigo-600 animate-pulse"
                    : "bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700"
                }`}
                title={voiceGuideEnabled ? "Zima Sauti Guide" : "Washa Sauti Guide (AI Voice)"}
              >
                {voiceGuideEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    Gemini Co-Pilot Instructions
                  </span>
                  <button
                    onClick={triggerGeminiAIInstruction}
                    disabled={isAiLoading || navState.distance === null}
                    className="text-[10px] text-blue-600 hover:text-blue-500 font-bold active:scale-95 disabled:opacity-50"
                  >
                    {isAiLoading ? "Inatengeneza..." : "Omba Msaada (Query AI)"}
                  </button>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed italic truncate-2-lines">
                  {aiSpokenInstruction || (voiceGuideEnabled ? "Inatafuta maelekezo ya sauti ya Gemini..." : "Bofya kitufe cha Spika kushoto ili kuanzisha msaada wa sauti ya AI.")}
                </p>
              </div>
            </div>

            {/* Manual Simulation Dashboard */}
            <div className="bg-white/95 border border-slate-200/85 rounded-2xl p-3 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  Majaribio ya Ndani (AR Simulation Controls)
                </span>
                <span className="text-[9px] text-emerald-800 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Geolocation Walk Controls */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Mwili / GPS movement:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={simulateWalkCloser}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Sogea Karibu
                    </button>
                    <button
                      onClick={simulateWalkAway}
                      className="bg-white hover:bg-slate-50 py-1.5 px-2.5 rounded-lg text-xs transition-all border border-slate-200 text-slate-650 shadow-2xs"
                      title="Walk away"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Manual Compass rotation fallback */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Compass Angle: {navState.heading}°</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => rotateCompass(-20)}
                      className="flex-1 bg-white hover:bg-slate-50 py-1.5 rounded-lg text-xs transition-all border border-slate-200 text-slate-600 flex items-center justify-center gap-0.5 shadow-2xs"
                    >
                      ↺ Geuza
                    </button>
                    <button
                      onClick={() => rotateCompass(20)}
                      className="flex-1 bg-white hover:bg-slate-50 py-1.5 rounded-lg text-xs transition-all border border-slate-200 text-slate-600 flex items-center justify-center gap-0.5 shadow-2xs"
                    >
                      Geuza ↻
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Permission check for Safari iOS */}
            {permissionPromptNeeded && (
              <div className="bg-amber-50 border border-amber-150 p-2.5 rounded-xl flex items-center justify-between backdrop-blur-md shadow-md">
                <span className="text-xs text-amber-850">Ruhusu Dira ya Simu kufanya kazi vizuri:</span>
                <button
                  onClick={requestCompassPermission}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all"
                >
                  Ruhusu Compass
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
