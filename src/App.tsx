import React, { useState, useEffect } from "react";
import { Compass, Plus, Sparkles, MapPin, Search, HelpCircle, CheckCircle2, MessageSquare, Landmark, Languages, Globe } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./lib/firebase";
import { LocationPin } from "./types";
import MapSelector from "./components/MapSelector";
import ARCamera from "./components/ARCamera";
import LocationCard from "./components/LocationCard";
import VoiceAssistant from "./components/VoiceAssistant";
import MainMap from "./components/MainMap";

export default function App() {
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNavPin, setActiveNavPin] = useState<LocationPin | null>(null);
  const [currentGPS, setCurrentGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");
  
  // UI Tabs / Screens
  // "list" = saved locations & map preview
  // "create" = place new pin form
  // "ai" = gemini assistant chat
  const [activeTab, setActiveTab] = useState<"list" | "create" | "ai">("list");
  
  // Language toggle: "sw" = Swahili, "en" = English
  const [lang, setLang] = useState<"sw" | "en">("sw");

  // Fetch pins in real-time from Firestore
  useEffect(() => {
    const q = query(collection(db, "ar_locations"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedPins: LocationPin[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LocationPin[];
        setPins(loadedPins);

        // Deep Link Check on initial load
        const urlParams = new URLSearchParams(window.location.search);
        const navId = urlParams.get("nav");
        if (navId) {
          const matchedPin = loadedPins.find((p) => p.id === navId);
          if (matchedPin) {
            setActiveNavPin(matchedPin);
          }
        }
      },
      (error) => {
        console.error("Firestore loading error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Request browser high-precision GPS positioning
  const requestGPS = () => {
    if (!("geolocation" in navigator)) {
      setGpsError("Simu yako haiauni upataji wa eneo kwa GPS (Geolocation not supported).");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentGPS({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsError("");
      },
      (err) => {
        console.warn("GPS error code:", err.code, err.message);
        setGpsError("Tafadhali washa huduma ya GPS na uruhusu kivinjari chako kusoma eneo lako.");
        
        // Provide standard fallback coordinates if GPS fails or in sandboxed dev environment
        if (!currentGPS) {
          setCurrentGPS({ lat: -6.8185, lng: 39.2905 }); // Dar es Salaam center
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Watch position for continuous real-time movement
  useEffect(() => {
    requestGPS(); // initial grab
    
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentGPS({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        null,
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleLocationCreated = (newPin: LocationPin) => {
    setActiveTab("list");
  };

  const handleDeletePin = (id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  const filteredPins = pins.filter((pin) =>
    pin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200 font-sans relative overflow-x-hidden" id="app-root-container">
      {/* Immersive cyber grids & gradient background arrays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#00e5ff_1px,transparent_1px),linear-gradient(to_bottom,#00e5ff_1px,transparent_1px)] bg-[size:32px_32px] z-0"></div>
      <div className="absolute top-0 left-1/4 w-[480px] h-[480px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-10 right-10 w-[480px] h-[480px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Top Header Navigation */}
      <header className="border-b border-slate-850 bg-[#090d16]/95 sticky top-0 z-40 backdrop-blur-md shadow-2xl relative">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur-xs opacity-50 group-hover:opacity-100 transition duration-300"></div>
              <Compass className="w-6 h-6 text-slate-950 relative z-10 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 font-display">
                  NAV_PULSE
                </h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">GPS AR Real-time Navigation</p>
            </div>
          </div>

          {/* Controls: Language Selection */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "sw" ? "en" : "sw")}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 font-bold transition-all active:scale-95 shadow-inner"
              title="Badili Lugha / Toggle Language"
            >
              <Languages className="w-4 h-4 text-cyan-400" />
              <span>{lang === "sw" ? "Swahili" : "English"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24 z-10 relative">
        
        {gpsError && (
          <div className="p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0"></span>
            <p className="font-semibold">{gpsError}</p>
          </div>
        )}

        {/* Tab Controls Navigation */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#0d1322] border border-slate-800/85 p-1.5 rounded-2xl mb-8 shadow-2xl relative z-10">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 font-display ${
              activeTab === "list"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-400 border border-cyan-500/35 shadow-lg shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>{lang === "sw" ? "Maeneo" : "Locations"}</span>
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 font-display ${
              activeTab === "create"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-400 border border-cyan-500/35 shadow-lg shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "sw" ? "Weka Eneo" : "Add Pin"}</span>
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 font-display ${
              activeTab === "ai"
                ? "bg-gradient-to-r from-cyan-500/10 to-blue-600/10 text-cyan-400 border border-cyan-500/35 shadow-lg shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === "sw" ? "Msaidizi AI" : "AI Copilot"}</span>
          </button>
        </div>

        {/* Display Screens */}
        {activeTab === "create" && (
          <div className="animate-fade-in">
            <MapSelector
              onLocationCreated={handleLocationCreated}
              currentGPS={currentGPS}
              requestGPS={requestGPS}
            />
          </div>
        )}

        {activeTab === "ai" && (
          <div className="animate-fade-in">
            <VoiceAssistant
              currentGPS={currentGPS}
              selectedPin={null}
              userLanguage={lang}
            />
          </div>
        )}

        {activeTab === "list" && (
          <div className="space-y-6">
            {/* Swahili Description Card / Introduction */}
            <div className="bg-gradient-to-br from-[#0c1221] to-[#090d16] border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <h2 className="text-lg font-black tracking-wider text-white uppercase font-display flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                {lang === "sw" ? "Saved Destinations" : "Saved Destinations"}
              </h2>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-sans">
                {lang === "sw" ? (
                  "Mfumo wa kisasa wa uramani angani (AR). Unaweza kuweka alama za duka au eneo lako, kutengeneza QR Code, na kumuongoza mteja kwa kamera ya AR yenye maelekezo ya mshale wa 3D angani na sauti ya Gemini AI!"
                ) : (
                  "Your personalized AR anchors and spatial coordinates. Drop location pins on our active GPS radar, write walkthrough descriptions, and scan generated QR codes to navigate with real-time floating 3D pointer lines!"
                )}
              </p>
              
              {/* Stat indicator */}
              <div className="flex items-center gap-3 mt-5 pt-4.5 border-t border-slate-800/60 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2 bg-[#090d16] px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shrink-0"></span>
                  <span className="font-bold text-slate-200 font-sans">{pins.length} Maeneo yaliyohifadhiwa</span>
                </div>
                {currentGPS && (
                  <div className="flex items-center gap-2 ml-auto font-mono text-[10px] text-cyan-400 bg-cyan-500/5 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GPS SYNC COMPLETE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Interactive Map (Standard / Satellite Toggle) */}
            <MainMap
              pins={filteredPins}
              currentGPS={currentGPS}
              onNavigate={(selected) => setActiveNavPin(selected)}
              userLanguage={lang}
            />

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-4.5 top-4 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={lang === "sw" ? "Tafuta eneo kwa jina au sifa..." : "Search locations by name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1322] border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 shadow-inner"
              />
            </div>

            {/* Locations grid */}
            {filteredPins.length === 0 ? (
              <div className="text-center py-12 bg-[#0d1322]/40 border border-dashed border-slate-800 rounded-3xl p-6 shadow-2xl">
                <MapPin className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-200">
                  {lang === "sw" ? "Hakuna maeneo yaliyopatikana" : "No locations found"}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {lang === "sw" ? "Bofya kichupo cha 'Weka Eneo' juu ili kuongeza duka au eneo la kwanza." : "Click the 'Add Pin' tab above to register your very first shop location."}
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-md font-display uppercase tracking-wider cursor-pointer"
                >
                  Ongeza Sasa (Add Pin)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredPins.map((pin) => (
                  <LocationCard
                    key={pin.id}
                    pin={pin}
                    currentGPS={currentGPS}
                    onNavigate={(selected) => setActiveNavPin(selected)}
                    onDelete={handleDeletePin}
                    userLanguage={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Active AR Camera overlay */}
      {activeNavPin && (
        <ARCamera
          targetPin={activeNavPin}
          currentGPS={currentGPS}
          userLanguage={lang}
          onClose={() => {
            // Clean up navigation query string if present
            const url = new URL(window.location.href);
            url.searchParams.delete("nav");
            window.history.replaceState({}, "", url.toString());
            
            setActiveNavPin(null);
          }}
        />
      )}

      {/* Humble Footer info */}
      <footer className="py-8 border-t border-slate-900 text-center text-xs text-slate-600 font-medium z-10 relative">
        <p>© 2026 NAV_PULSE PWA AR Navigation. Powered by Gemini & Firebase</p>
      </footer>
    </div>
  );
}
