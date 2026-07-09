import React, { useState, useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import { Compass, Layers, Globe, Settings, MapPin, Sparkles, AlertTriangle, Play } from "lucide-react";
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
          glyphColor="#ffffff" 
        />
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
  const [mapCenter, setMapCenter] = useState({ lat: -6.8185, lng: 39.2905 }); // Default Dar es Salaam

  // Adjust center based on current GPS or available pins
  useEffect(() => {
    if (currentGPS) {
      setMapCenter({ lat: currentGPS.lat, lng: currentGPS.lng });
    } else if (pins.length > 0) {
      setMapCenter({ lat: pins[0].latitude, lng: pins[0].longitude });
    }
  }, [currentGPS, pins.length === 0]);

  if (!hasValidKey) {
    return (
      <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="google-maps-setup-instructions">
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
            <AlertTriangle className="text-amber-400 w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wider uppercase font-display">
              {userLanguage === "sw" ? "Ufunguo wa Google Maps Unahitajika" : "Google Maps API Key Required"}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {userLanguage === "sw" ? "Usanidi wa Ramani Hai (Interactive Maps Setup)" : "Required to enable real-time radar mapping"}
            </p>
          </div>
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

          <div className="pt-2 text-[11px] text-slate-500 font-medium italic">
            {userLanguage === "sw" 
              ? "* Programu itajijenga upya moja kwa moja baada ya kuongeza ufunguo, hakuna haja ya ku-reload ukurasa."
              : "* The app rebuilds automatically after you add the secret. Do not manually reload the page."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-4.5 shadow-2xl relative overflow-hidden" id="interactive-radar-map-card">
      {/* Header and Style Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Globe className="text-cyan-400 w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-wider uppercase font-display">
              {userLanguage === "sw" ? "Ramani ya Maeneo (Radar Map)" : "Radar Landmarks Map"}
            </h3>
            <p className="text-[10px] text-slate-400">
              {userLanguage === "sw" ? "Gusa alama kupata maelekezo ya AR" : "Tap pins to start AR space drive"}
            </p>
          </div>
        </div>

        {/* Satellite vs Roadmap Toggles */}
        <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setMapType("roadmap")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
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

      {/* Map Element */}
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
            {/* User current location marker */}
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

            {/* Pins markers */}
            {pins.map((pin) => (
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
      </div>
    </div>
  );
}
