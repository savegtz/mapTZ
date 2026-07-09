import React, { useState, useEffect } from "react";
import { MapPin, Search, Compass, Save, CheckCircle2, Navigation, RefreshCw } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { LocationPin } from "../types";

// Standard landmarks for Swahili/Tanzania locations or custom test presets
const PRESETS = [
  { name: "Tabata Dampo Junction", lat: -6.8093, lng: 39.2455, desc: "Kituo maarufu cha mabasi na makutano kando ya barabara ya Nelson Mandela." },
  { name: "Loyola High School", lat: -6.7972, lng: 39.2458, desc: "Shule maarufu ya Loyola iliyopo Kigogo/Kurasini Road." },
  { name: "Buguruni Sheli Station", lat: -6.8228, lng: 39.2618, desc: "Kituo kikubwa cha mafuta na biashara kilichopo makutano ya barabara ya Mandela na Uhuru." },
  { name: "Quality Center Mall", lat: -6.8296, lng: 39.2612, desc: "Kituo cha kisasa cha manunuzi kilichopo barabara ya Nyerere." },
  { name: "Kigogo Mwisho Bus Stop", lat: -6.8021, lng: 39.2575, desc: "Kituo cha mabasi ya Kigogo Mwisho kando ya mto Msimbazi." },
  { name: "Tabata Sigara", lat: -6.8188, lng: 39.2315, desc: "Eneo maarufu la viwanda na makazi karibu na kituo cha mitaa ya Tabata." }
];

interface MapSelectorProps {
  onLocationCreated: (pin: LocationPin) => void;
  currentGPS: { lat: number; lng: number } | null;
  requestGPS: () => void;
}

export default function MapSelector({ onLocationCreated, currentGPS, requestGPS }: MapSelectorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Populate from GPS if available and inputs are empty
  useEffect(() => {
    if (currentGPS && lat === "" && lng === "") {
      setLat(Number(currentGPS.lat.toFixed(6)));
      setLng(Number(currentGPS.lng.toFixed(6)));
    }
  }, [currentGPS]);

  const handleUseCurrentGPS = () => {
    requestGPS();
    if (currentGPS) {
      setLat(Number(currentGPS.lat.toFixed(6)));
      setLng(Number(currentGPS.lng.toFixed(6)));
      setErrorMsg("");
    } else {
      setErrorMsg("Kupata GPS bado inatafutwa. Hakikisha umeruhusu GPS kwenye kifaa chako.");
    }
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name.split(" (")[0]);
    setLat(preset.lat);
    setLng(preset.lng);
    setDescription(preset.desc);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Tafadhali weka jina la eneo / Please enter a location name.");
      return;
    }
    if (lat === "" || lng === "") {
      setErrorMsg("Tafadhali weka longitudo na latitudo za eneo.");
      return;
    }

    setIsSaving(true);
    try {
      const pinData = {
        name: name.trim(),
        description: description.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        createdAt: Date.now(),
        audioText: `Unaelekea kwenye eneo la ${name.trim()}. ${description.trim()}`
      };

      const docRef = await addDoc(collection(db, "ar_locations"), pinData);
      
      const newPin: LocationPin = {
        id: docRef.id,
        ...pinData
      };

      setSaveSuccess(true);
      onLocationCreated(newPin);
      
      // Reset form
      setName("");
      setDescription("");
      setLat("");
      setLng("");
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error("Error saving to Firestore: ", err);
      setErrorMsg(`Hitilafu imetokea wakati wa kuhifadhi: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="map-selector-card">
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/25">
          <MapPin className="text-cyan-400 w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white tracking-wider uppercase font-display">Weka Eneo Jipya (Add Location)</h2>
          <p className="text-xs text-slate-400">Chagua eneo ili kutengeneza QR Code na Uramani wa AR</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Eneo limehifadhiwa kwa mafanikio! QR Code imetengenezwa hapa chini.</span>
        </div>
      )}

      {/* Manual Coord Inputs or GPS Trigger */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide font-display">
            Jina la Eneo au Duka (Location / Shop Name) *
          </label>
          <input
            type="text"
            required
            placeholder="mf. Lango Kuu la Duka, Ofisi ya Mapokezi, nk."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide font-display">
            Maelekezo ya Ziada (Directions Guidance)
          </label>
          <textarea
            placeholder="mf. Ingia getini, geuka kushoto, upande wa pili wa ngazi ya kwanza..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all resize-none shadow-inner"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide font-display">
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="mf. -6.8185"
              value={lat}
              onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide font-display">
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="mf. 39.2905"
              value={lng}
              onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* GPS Actions & Simulation Helpers */}
        <div className="flex flex-col gap-3 bg-[#090d16] p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide font-display">GPS au Presets:</span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleUseCurrentGPS}
              className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-inner cursor-pointer"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              Chukua GPS Yangu
            </button>
            <button
              type="button"
              onClick={requestGPS}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
              title="Refresh GPS Accuracy"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {currentGPS && (
            <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GPS Lock: {currentGPS.lat.toFixed(5)}, {currentGPS.lng.toFixed(5)}</span>
            </div>
          )}

          {/* Quick presets for testing */}
          <div className="mt-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 block mb-2 font-black font-display">Presets maarufu za majaribio:</span>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-[11px] bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 text-left px-2.5 py-2 rounded-xl border border-slate-800/80 hover:border-cyan-500/20 transition-all truncate shadow-2xs cursor-pointer font-medium"
                >
                  📍 {preset.name.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-cyan-500/10 active:scale-[0.99] disabled:opacity-50 uppercase tracking-wider font-display cursor-pointer"
          id="btn-save-location"
        >
          {isSaving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Hifadhi & Tengeneza QR Code</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
