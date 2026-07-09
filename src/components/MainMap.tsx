import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import { Compass, Layers, Globe, Settings, MapPin, Sparkles, AlertTriangle, X, ZoomIn, ZoomOut, Target, Utensils, ShoppingCart, Ticket, Pill } from "lucide-react";
import { LocationPin } from "../types";
import { calculateDistance } from "../utils/geo";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

interface MainMapProps {
  pins: LocationPin[];
  currentGPS: { lat: number; lng: number } | null;
  onNavigate: (pin: LocationPin) => void;
  userLanguage?: "sw" | "en";
}

interface MarkerWithInfoWindowProps {
  pin: LocationPin;
  currentGPS: { lat: number; lng: number } | null;
  onNavigate: (pin: LocationPin) => void;
  userLanguage: "sw" | "en";
  key?: React.Key | string | number;
}

// Sub-component to manage AdvancedMarker with its InfoWindow
function MarkerWithInfoWindow({ 
  pin, 
  currentGPS, 
  onNavigate, 
  userLanguage 
}: MarkerWithInfoWindowProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isOpen, setIsOpen] = useState(false);

  const distance = currentGPS 
    ? calculateDistance(currentGPS.lat, currentGPS.lng, pin.latitude, pin.longitude)
    : null;

  const distanceText = distance !== null
    ? distance > 1000 
      ? `${(distance / 1000).toFixed(1)} km` 
      : `${Math.round(distance)} m`
    : "";

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: pin.latitude, lng: pin.longitude }}
        title={pin.name}
        onClick={() => setIsOpen(true)}
      >
        <Pin 
          background={pin.isBusiness ? "#06b6d4" : "#3b82f6"} 
          borderColor="#0f172a" 
          glyphColor="#ffffff" />
      </AdvancedMarker>

      {isOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setIsOpen(false)}
          headerDisabled={true}
        >
          <div className="p-2 min-w-[200px] text-slate-900 font-sans">
            <h4 className="text-sm font-black tracking-tight flex items-center gap-1.5 text-slate-950 mb-1">
              <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
              {pin.name}
            </h4>
            
            {pin.businessCategory && (
              <span className="text-[9px] uppercase font-black bg-cyan-150 text-cyan-800 px-2 py-0.5 rounded border border-cyan-200 block w-max mb-2">
                {pin.businessCategory}
              </span>
            )}

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
              {pin.description || (userLanguage === "sw" ? "Hakuna maelezo ya ziada." : "No additional description.")}
            </p>

            <div className="flex items-center justify-between gap-2.5 border-t border-slate-100 pt-2.5">
              {distanceText && (
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  📍 {distanceText}
                </span>
              )}
              <button
                onClick={() => {
                  onNavigate(pin);
                  setIsOpen(false);
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{userLanguage === "sw" ? "AR Nav" : "Start AR"}</span>
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function MainMap({ 
  pins, 
  currentGPS, 
  onNavigate, 
  userLanguage = "sw" 
}: MainMapProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [mapCenter, setMapCenter] = useState({ lat: -6.7214, lng: 39.1913 }); // Centered around Goba, Dar es Salaam
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  // Demo interactive states
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ width: 500, height: 380 });
  const [zoom, setZoom] = useState(14);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedDemoPin, setSelectedDemoPin] = useState<LocationPin | null>(null);

  // Set up category filter state
  const [selectedCategory, setSelectedCategory] = useState<"ZOTE" | "CHAKULA" | "SOKO" | "TIKETI" | "DAWA">("ZOTE");

  // Set up demo pins fallback if user has no pins yet (exactly matching user's uploaded Goba map screenshot)
  const activePins = pins.length > 0 ? pins : [
    {
      id: "demo-cakezonetz",
      name: "Cakezonetz",
      latitude: -6.7198,
      longitude: 39.1905,
      description: userLanguage === "sw" ? "Duka la keki na mikate tamu, Goba. Agiza keki za sherehe hapa." : "Delicious cakes and bakery shop in Goba.",
      isBusiness: true,
      businessCategory: "CHAKULA",
      createdAt: Date.now()
    },
    {
      id: "demo-mathy-chips",
      name: "Mathy chips",
      latitude: -6.7248,
      longitude: 39.1895,
      description: userLanguage === "sw" ? "Chipsi tamu, kuku choma na vinywaji baridi Goba." : "Local fast food spot serving fresh chips and roast chicken.",
      isBusiness: true,
      businessCategory: "CHAKULA",
      createdAt: Date.now()
    },
    {
      id: "demo-somewhere-hq",
      name: "SOMEWHERE HQ",
      latitude: -6.7202,
      longitude: 39.1965,
      description: userLanguage === "sw" ? "Ofisi kuu ya Somewhere, huduma za kibiashara na teknolojia." : "Headquarters of Somewhere services and technology.",
      isBusiness: true,
      businessCategory: "SOKO",
      createdAt: Date.now()
    },
    {
      id: "demo-serene-apts",
      name: "Goba Serene Apartments",
      latitude: -6.7275,
      longitude: 39.1942,
      description: userLanguage === "sw" ? "Apartment za kisasa na tulivu kwa malazi Goba." : "Modern and serene rental apartments in Goba.",
      isBusiness: true,
      businessCategory: "TIKETI",
      createdAt: Date.now()
    },
    {
      id: "demo-msangai-market",
      name: "MSANGAI MINI SUPER MARKET",
      latitude: -6.7320,
      longitude: 39.1950,
      description: userLanguage === "sw" ? "Supermarket ndogo yenye bidhaa zote za nyumbani na chakula." : "Mini supermarket with a wide range of groceries and home needs.",
      isBusiness: true,
      businessCategory: "SOKO",
      createdAt: Date.now()
    },
    {
      id: "demo-goba-dawa",
      name: "Goba Pharmacy / Dawa",
      latitude: -6.7230,
      longitude: 39.1870,
      description: userLanguage === "sw" ? "Duka la dawa lililo wazi masaa 24 karibu na barabara kuu." : "24/7 modern pharmacy providing health prescriptions.",
      isBusiness: true,
      businessCategory: "DAWA",
      createdAt: Date.now()
    },
    {
      id: "demo-goba-tiketi",
      name: "Goba Plaza / Tiketi Depot",
      latitude: -6.7260,
      longitude: 39.1980,
      description: userLanguage === "sw" ? "Kituo cha kukata tiketi za mabasi, ndege na matukio ya burudani." : "Ticket booking desk for transit, flights and local events.",
      isBusiness: true,
      businessCategory: "TIKETI",
      createdAt: Date.now()
    }
  ];

  // Filter pins based on category
  const filteredPins = (pins.length > 0 ? pins : activePins).filter(pin => {
    if (selectedCategory === "ZOTE") return true;
    return pin.businessCategory === selectedCategory;
  });

  // Adjust center based on current GPS or available pins
  useEffect(() => {
    if (currentGPS) {
      setMapCenter({ lat: currentGPS.lat, lng: currentGPS.lng });
    } else if (activePins.length > 0) {
      setMapCenter({ lat: activePins[0].latitude, lng: activePins[0].longitude });
    }
  }, [currentGPS, pins.length]);

  // Handle dimensions calculation for relative coordinates mapping
  useEffect(() => {
    if (containerRef.current) {
      setDims({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, [pins.length, showSetupInstructions, activePins.length]);

  // Pointer drag events for Demo Simulator Panning
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".popup-window")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Convert GPS coordinates to 2D simulator space
  const zoomScale = Math.pow(2, zoom - 14) * 220000;

  const getScreenCoords = (lat: number, lng: number) => {
    const dy = lat - mapCenter.lat;
    const dx = lng - mapCenter.lng;
    
    const x = dims.width / 2 + dx * zoomScale + panOffset.x;
    const y = dims.height / 2 - dy * zoomScale + panOffset.y;
    return { x, y };
  };

  // Setup Key Instructions UI
  if (showSetupInstructions) {
    return (
      <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-fade-in" id="google-maps-setup-instructions">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
              <AlertTriangle className="text-amber-400 w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wider uppercase font-display">
                {userLanguage === "sw" ? "Sanidi Google Maps Key" : "Configure Google Maps Key"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {userLanguage === "sw" ? "Kubadili kutoka Hali ya Demo kwenda Ramani Halisi" : "Switch from Demo Mode to production map system"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowSetupInstructions(false)}
            className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-450 hover:text-white transition-all border border-slate-700/40 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#090d16] border border-slate-800 p-5 rounded-2xl space-y-4 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-slate-200">
            {userLanguage === "sw" 
              ? "Ili kuonesha ramani hai ya maeneo yote yaliyohifadhiwa na kubadili muonekano wa Satelaiti, tafadhali weka ufunguo wako wa Google Maps:"
              : "To render an interactive map showing all registered landmarks with satellite overlay toggles, please provide a Google Maps API Key:"}
          </p>

          <ol className="list-decimal pl-5 space-y-2.5 font-sans">
            <li>
              <strong>{userLanguage === "sw" ? "Pata ufunguo wa API:" : "Get an API key:"}</strong>{" "}
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 underline font-bold hover:text-cyan-300 transition-colors"
              >
                console.cloud.google.com/google/maps-apis
              </a>
            </li>
            <li>
              <strong>{userLanguage === "sw" ? "Weka ufunguo kwenye AI Studio:" : "Add your key as a secret in AI Studio:"}</strong>
              <ul className="list-disc pl-5 mt-1.5 space-y-1.5 text-slate-400">
                <li>{userLanguage === "sw" ? "Bofya ikoni ya Settings (⚙️ juu kulia)." : "Open Settings (⚙️ gear icon, top-right corner)"}</li>
                <li>{userLanguage === "sw" ? "Chagua Secrets." : "Select Secrets"}</li>
                <li>{userLanguage === "sw" ? "Andika GOOGLE_MAPS_PLATFORM_KEY kisha bonyeza Enter." : "Type GOOGLE_MAPS_PLATFORM_KEY as the secret name, press Enter."}</li>
                <li>{userLanguage === "sw" ? "Bandika (paste) ufunguo wako kama thamani, bonyeza Enter." : "Paste your API key as the value, press Enter."}</li>
              </ul>
            </li>
          </ol>

          <div className="pt-2 text-[11px] text-slate-500 font-medium italic border-t border-slate-800/40">
            {userLanguage === "sw" 
              ? "* Programu itajijenga upya moja kwa moja baada ya kuongeza ufunguo, hakuna haja ya ku-reload ukurasa."
              : "* The app rebuilds automatically after you add the secret. Do not manually reload the page."}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setShowSetupInstructions(false)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-black uppercase tracking-wider hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg cursor-pointer"
          >
            {userLanguage === "sw" ? "Rudi kwenye Ramani ya Demo" : "Return to Demo Map"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-4.5 shadow-2xl relative overflow-hidden animate-fade-in" id="interactive-radar-map-card">
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header and Style Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Globe className="text-cyan-400 w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-wider uppercase font-display">
                {userLanguage === "sw" ? "Ramani ya Maeneo (Radar Map)" : "Radar Landmarks Map"}
              </h3>
              {!hasValidKey && (
                <span className="text-[8.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {userLanguage === "sw" ? "Gusa alama kupata maelekezo ya AR" : "Tap pins to start AR space drive"}
            </p>
          </div>
        </div>

        {/* Action Controls / Map Mode Toggles */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {!hasValidKey && (
            <button
              onClick={() => setShowSetupInstructions(true)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-[#090d16] text-[10px] text-slate-400 hover:text-slate-200 font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
              <span>{userLanguage === "sw" ? "Weka Key" : "Add API Key"}</span>
            </button>
          )}

          {/* Satellite vs Roadmap Toggles */}
          <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setMapType("roadmap")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                mapType === "roadmap"
                  ? "bg-gradient-to-r from-cyan-500/15 to-blue-600/15 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-450 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{userLanguage === "sw" ? "Kawaida" : "Standard"}</span>
            </button>
            <button
              onClick={() => setMapType("satellite")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                mapType === "satellite"
                  ? "bg-gradient-to-r from-cyan-500/15 to-blue-600/15 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-450 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{userLanguage === "sw" ? "Satelaiti" : "Satellite"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map View Element */}
      {hasValidKey ? (
        <div className="w-full h-[380px] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={mapCenter}
              center={mapCenter}
              defaultZoom={13}
              mapTypeId={mapType}
              mapId="DEMO_MAP_ID"
              disableDefaultUI={false}
              zoomControl={true}
              mapTypeControl={false}
              fullscreenControl={false}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%" }}
            >
              {currentGPS && (
                <AdvancedMarker
                  position={{ lat: currentGPS.lat, lng: currentGPS.lng }}
                  title={userLanguage === "sw" ? "Eneo Lako la Sasa" : "Your Current Location"}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-6 h-6 rounded-full bg-cyan-400 animate-ping opacity-60"></div>
                    <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-md relative z-10"></div>
                  </div>
                </AdvancedMarker>
              )}

              {filteredPins.map((pin) => (
                <MarkerWithInfoWindow
                  key={pin.id}
                  pin={pin}
                  currentGPS={currentGPS}
                  onNavigate={onNavigate}
                  userLanguage={userLanguage}
                />
              ))}
            </Map>
          </APIProvider>

          {/* Dynamic Swahili Categories Floating Filter Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-full shadow-2xl p-1 flex items-center gap-1 border border-slate-200/80 z-25 max-w-[90%] overflow-x-auto scrollbar-none select-none">
            {/* ZOTE (All) */}
            <button
              onClick={() => {
                setSelectedCategory("ZOTE");
                setSelectedDemoPin(null);
              }}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "ZOTE"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{userLanguage === "sw" ? "ZOTE" : "ALL"}</span>
            </button>

            {/* CHAKULA */}
            <button
              onClick={() => {
                setSelectedCategory("CHAKULA");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "CHAKULA"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Utensils className="w-2.5 h-2.5 text-rose-500" />
              </div>
              <span>{userLanguage === "sw" ? "CHAKULA" : "FOOD"}</span>
            </button>

            {/* SOKO */}
            <button
              onClick={() => {
                setSelectedCategory("SOKO");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "SOKO"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-2.5 h-2.5 text-emerald-500" />
              </div>
              <span>{userLanguage === "sw" ? "SOKO" : "MARKET"}</span>
            </button>

            {/* TIKETI */}
            <button
              onClick={() => {
                setSelectedCategory("TIKETI");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "TIKETI"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Ticket className="w-2.5 h-2.5 text-amber-500" />
              </div>
              <span>{userLanguage === "sw" ? "TIKETI" : "TICKETS"}</span>
            </button>

            {/* DAWA */}
            <button
              onClick={() => {
                setSelectedCategory("DAWA");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "DAWA"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Pill className="w-2.5 h-2.5 text-blue-500" />
              </div>
              <span>{userLanguage === "sw" ? "DAWA" : "PHARMACY"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* High-fidelity Fallback Interactive Simulator Map with Drag & Pan */
        <div 
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-[380px] rounded-2xl overflow-hidden border border-slate-850 shadow-2xl select-none cursor-grab active:cursor-grabbing relative"
          style={{
            backgroundColor: mapType === "satellite" ? "#040b18" : "#040813",
            backgroundImage: mapType === "satellite" 
              ? "url('https://images.unsplash.com/photo-1548345680-f5475ea5df84?auto=format&fit=crop&w=1200&q=80')" 
              : "linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px)",
            backgroundSize: mapType === "satellite" ? "cover" : "32px 32px",
            backgroundPosition: mapType === "satellite" 
              ? `calc(50% + ${panOffset.x}px) calc(50% + ${panOffset.y}px)` 
              : `${panOffset.x}px ${panOffset.y}px`,
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Subtle radar scan overlays */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent animate-pulse z-10"></div>
          {mapType === "roadmap" && (
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/5 rounded-full w-[250px] h-[250px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping opacity-45 duration-[5000ms] z-10"></div>
          )}

          {/* Compass grid overlay in center */}
          <div className="absolute bottom-4 left-4 pointer-events-none z-10 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/80 font-mono text-[9px] text-slate-400 flex items-center gap-1.5 shadow-lg">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>
              {Math.abs(mapCenter.lat + (panOffset.y / zoomScale)).toFixed(4)}° S,{" "}
              {Math.abs(mapCenter.lng - (panOffset.x / zoomScale)).toFixed(4)}° E
            </span>
          </div>

          {/* Floating Instructions Banner */}
          <div className="absolute top-3 left-3 right-3 bg-[#090d16]/90 backdrop-blur-md border border-slate-800/80 p-2.5 rounded-xl z-20 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <p className="text-[10px] text-slate-300 leading-relaxed font-sans font-medium">
                {userLanguage === "sw" 
                  ? "Hali ya Demo inatumika. Unaweza kuburuta (pan), kukuza (zoom), na kugusa maeneo."
                  : "Demo simulation active. You can pan, zoom, and select landmarks interactive."}
              </p>
            </div>
          </div>

          {/* Map Controls (+ / - / Reset) */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
            <button
              onClick={() => setZoom(prev => Math.min(18, prev + 1))}
              className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-850 flex items-center justify-center shadow-lg hover:text-cyan-400 transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(10, prev - 1))}
              className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-850 flex items-center justify-center shadow-lg hover:text-cyan-400 transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setPanOffset({ x: 0, y: 0 });
                setZoom(14);
              }}
              className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-850 flex items-center justify-center shadow-lg hover:text-cyan-400 transition-all cursor-pointer"
              title="Recenter"
            >
              <Target className="w-4 h-4" />
            </button>
          </div>

          {/* Render User GPS in Simulator */}
          {(() => {
            const userLat = currentGPS?.lat ?? mapCenter.lat;
            const userLng = currentGPS?.lng ?? mapCenter.lng;
            const pos = getScreenCoords(userLat, userLng);

            if (pos.x >= -20 && pos.x <= dims.width + 20 && pos.y >= -20 && pos.y <= dims.height + 20) {
              return (
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none"
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-8 h-8 rounded-full bg-cyan-400 animate-ping opacity-50"></div>
                    <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-xl relative z-10"></div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Render Pin Markers */}
          {filteredPins.map((pin) => {
            const pos = getScreenCoords(pin.latitude, pin.longitude);

            if (pos.x < -40 || pos.x > dims.width + 40 || pos.y < -40 || pos.y > dims.height + 40) {
              return null;
            }

            // Custom pin background and icon styling depending on Swahili category
            let pinBg = "bg-blue-600 text-white border-blue-400";
            let pulseBg = "bg-blue-600/35";
            let PinIcon = MapPin;

            if (pin.businessCategory === "CHAKULA") {
              pinBg = "bg-rose-500 text-white border-rose-400";
              pulseBg = "bg-rose-500/35";
              PinIcon = Utensils;
            } else if (pin.businessCategory === "SOKO") {
              pinBg = "bg-emerald-500 text-white border-emerald-400";
              pulseBg = "bg-emerald-500/35";
              PinIcon = ShoppingCart;
            } else if (pin.businessCategory === "TIKETI") {
              pinBg = "bg-amber-500 text-slate-950 border-amber-400";
              pulseBg = "bg-amber-500/35";
              PinIcon = Ticket;
            } else if (pin.businessCategory === "DAWA") {
              pinBg = "bg-blue-500 text-white border-blue-400";
              pulseBg = "bg-blue-500/35";
              PinIcon = Pill;
            } else if (pin.isBusiness) {
              pinBg = "bg-cyan-500 text-slate-950 border-cyan-400";
              pulseBg = "bg-cyan-500/35";
            }

            return (
              <button
                key={pin.id}
                onClick={() => setSelectedDemoPin(pin)}
                className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center group transition-all hover:scale-110 active:scale-95 z-20 cursor-pointer"
                style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
              >
                <div className="relative flex items-center justify-center">
                  <div className={`absolute w-7 h-7 rounded-full ${pulseBg} animate-pulse opacity-80`}></div>
                  <div className={`w-5.5 h-5.5 rounded-full ${pinBg} border-2 flex items-center justify-center shadow-lg relative z-10`}>
                    <PinIcon className="w-3 h-3" />
                  </div>
                </div>
                <span className="mt-1 px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-[9px] font-black tracking-wider uppercase text-slate-200 shadow-md whitespace-nowrap">
                  {pin.name}
                </span>
              </button>
            );
          })}

          {/* Simulated InfoWindow Overlay */}
          {selectedDemoPin && (() => {
            const pos = getScreenCoords(selectedDemoPin.latitude, selectedDemoPin.longitude);
            const distance = currentGPS 
              ? calculateDistance(currentGPS.lat, currentGPS.lng, selectedDemoPin.latitude, selectedDemoPin.longitude)
              : calculateDistance(mapCenter.lat, mapCenter.lng, selectedDemoPin.latitude, selectedDemoPin.longitude);

            const distanceText = distance > 1000 
              ? `${(distance / 1000).toFixed(1)} km` 
              : `${Math.round(distance)} m`;

            return (
              <div 
                className="absolute bg-[#0b101c]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl w-[220px] z-30 font-sans popup-window animate-scale-in"
                style={{
                  left: `${Math.max(10, Math.min(dims.width - 230, pos.x - 110))}px`,
                  top: `${Math.max(65, Math.min(dims.height - 180, pos.y - 170))}px`
                }}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <h4 className="text-xs font-black tracking-tight flex items-center gap-1 text-white leading-tight">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="line-clamp-1">{selectedDemoPin.name}</span>
                  </h4>
                  <button 
                    onClick={() => setSelectedDemoPin(null)}
                    className="w-5 h-5 rounded-md bg-slate-800/40 hover:bg-slate-800 text-slate-450 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {selectedDemoPin.businessCategory && (
                  <span className="text-[8.5px] uppercase font-black bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 block w-max mb-1.5">
                    {selectedDemoPin.businessCategory}
                  </span>
                )}

                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                  {selectedDemoPin.description || (userLanguage === "sw" ? "Hakuna maelezo ya ziada." : "No additional description.")}
                </p>

                <div className="flex items-center justify-between gap-2.5 border-t border-slate-800/60 pt-2.5">
                  <span className="text-[9.5px] font-mono font-bold text-slate-400">
                    📍 {distanceText}
                  </span>
                  <button
                    onClick={() => {
                      onNavigate(selectedDemoPin);
                      setSelectedDemoPin(null);
                    }}
                    className="flex items-center gap-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    <Compass className="w-3 h-3" />
                    <span>{userLanguage === "sw" ? "AR Nav" : "Start AR"}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Dynamic Swahili Categories Floating Filter Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md rounded-full shadow-2xl p-1 flex items-center gap-1 border border-slate-200/80 z-25 max-w-[90%] overflow-x-auto scrollbar-none select-none">
            {/* ZOTE (All) */}
            <button
              onClick={() => {
                setSelectedCategory("ZOTE");
                setSelectedDemoPin(null);
              }}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "ZOTE"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{userLanguage === "sw" ? "ZOTE" : "ALL"}</span>
            </button>

            {/* CHAKULA */}
            <button
              onClick={() => {
                setSelectedCategory("CHAKULA");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "CHAKULA"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Utensils className="w-2.5 h-2.5 text-rose-500" />
              </div>
              <span>{userLanguage === "sw" ? "CHAKULA" : "FOOD"}</span>
            </button>

            {/* SOKO */}
            <button
              onClick={() => {
                setSelectedCategory("SOKO");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "SOKO"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-2.5 h-2.5 text-emerald-500" />
              </div>
              <span>{userLanguage === "sw" ? "SOKO" : "MARKET"}</span>
            </button>

            {/* TIKETI */}
            <button
              onClick={() => {
                setSelectedCategory("TIKETI");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "TIKETI"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Ticket className="w-2.5 h-2.5 text-amber-500" />
              </div>
              <span>{userLanguage === "sw" ? "TIKETI" : "TICKETS"}</span>
            </button>

            {/* DAWA */}
            <button
              onClick={() => {
                setSelectedCategory("DAWA");
                setSelectedDemoPin(null);
              }}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer shrink-0 ${
                selectedCategory === "DAWA"
                  ? "bg-slate-950 text-white shadow-md scale-105"
                  : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950"
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Pill className="w-2.5 h-2.5 text-blue-500" />
              </div>
              <span>{userLanguage === "sw" ? "DAWA" : "PHARMACY"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
