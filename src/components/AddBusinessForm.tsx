import React, { useState, useEffect } from "react";
import { 
  Compass, MapPin, Search, CheckCircle2, Navigation, RefreshCw, 
  Store, Globe, Phone, Clock, Camera, ChevronRight, ChevronLeft, 
  ShieldCheck, ArrowRight, Check, Sparkles, AlertCircle
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { LocationPin } from "../types";

// High quality preset photos for businesses to choose from
const PRESET_PHOTOS = [
  { url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=400&q=80", label: "Local Retail Shop" },
  { url: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=400&q=80", label: "General Grocery Store" },
  { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=80", label: "Clothing Boutique" },
  { url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80", label: "Cozy Café & Diner" },
  { url: "https://images.unsplash.com/photo-1521503862198-2ae9a997bbc9?auto=format&fit=crop&w=400&q=80", label: "Executive Office" },
  { url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80", label: "Service Workshop / Tech Repairs" }
];

interface AddBusinessFormProps {
  onBusinessCreated: (pin: LocationPin) => void;
  currentGPS: { lat: number; lng: number } | null;
  requestGPS: () => void;
  userLanguage?: "sw" | "en";
}

export default function AddBusinessForm({ 
  onBusinessCreated, 
  currentGPS, 
  requestGPS, 
  userLanguage = "sw" 
}: AddBusinessFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 10;

  // Step States
  const [businessName, setBusinessName] = useState("");
  
  // Step 2 Types
  const [types, setTypes] = useState<string[]>([]);
  
  // Step 3 Category
  const [category, setCategory] = useState("");
  
  // Step 4 Service Areas
  const [serviceAreas, setServiceAreas] = useState("");
  
  // Step 5 Contacts
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  
  // Step 6 Address & Coords
  const [country, setCountry] = useState("Tanzania");
  const [street, setStreet] = useState("");
  const [town, setTown] = useState("");
  const [postcode, setPostcode] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");

  // Step 7 Hours
  const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [hours, setHours] = useState<{ [day: string]: { closed: boolean; openTime: string; closeTime: string } }>(
    DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = { closed: false, openTime: "08:00", closeTime: "18:00" };
      return acc;
    }, {} as any)
  );

  // Step 8 Description
  const [description, setDescription] = useState("");
  
  // Step 9 Photo
  const [photoUrl, setPhotoUrl] = useState(PRESET_PHOTOS[0].url);

  // Step 10 Verification & Submit states
  const [verified, setVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Populate coordinates from current GPS lock automatically if empty
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
      setErrorMsg(userLanguage === "sw" 
        ? "Kupata GPS bado inatafutwa. Hakikisha umeruhusu GPS kwenye kifaa chako."
        : "Acquiring GPS lock. Ensure geolocation permissions are approved.");
    }
  };

  const toggleType = (typeId: string) => {
    if (types.includes(typeId)) {
      setTypes(types.filter(t => t !== typeId));
    } else {
      setTypes([...types, typeId]);
    }
  };

  const toggleDayClosed = (day: string) => {
    setHours({
      ...hours,
      [day]: { ...hours[day], closed: !hours[day].closed }
    });
  };

  const handleTimeChange = (day: string, field: "openTime" | "closeTime", value: string) => {
    setHours({
      ...hours,
      [day]: { ...hours[day], [field]: value }
    });
  };

  const handleInstantVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerified(true);
    }, 2000);
  };

  const handleNext = () => {
    setErrorMsg("");
    if (step === 1 && !businessName.trim()) {
      setErrorMsg(userLanguage === "sw" ? "Tafadhali weka jina la biashara yako." : "Please enter your business name.");
      return;
    }
    if (step === 2 && types.length === 0) {
      setErrorMsg(userLanguage === "sw" ? "Tafadhali chagua angalau aina moja ya biashara." : "Please select at least one business type.");
      return;
    }
    if (step === 3 && !category.trim()) {
      setErrorMsg(userLanguage === "sw" ? "Tafadhali weka kundi la biashara yako." : "Please enter a business category.");
      return;
    }
    if (step === 6) {
      if (!street.trim() || !town.trim()) {
        setErrorMsg(userLanguage === "sw" ? "Anwani na mji ni lazima kujazwa." : "Street address and town are required.");
        return;
      }
      if (lat === "" || lng === "") {
        setErrorMsg(userLanguage === "sw" ? "Mratibu wa ramani (GPS coordinates) unahitajika." : "GPS coordinates are required to place your business on the map.");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSaveBusiness = async () => {
    setIsSaving(true);
    setErrorMsg("");

    try {
      const pinData = {
        name: businessName.trim(),
        description: description.trim() || `${category} business located at ${street}, ${town}.`,
        latitude: Number(lat),
        longitude: Number(lng),
        createdAt: Date.now(),
        imageUrl: photoUrl,
        audioText: `Unaelekea kwenye biashara iliyothibitishwa ya ${businessName.trim()}. Ni aina ya ${category}. ${description.trim() || "Karibu tukuhudumie."}`,
        
        // Business Profile Specifics
        isBusiness: true,
        businessType: types,
        businessCategory: category.trim(),
        serviceAreas: serviceAreas.trim(),
        phone: phone.trim(),
        website: website.trim(),
        address: {
          country: country.trim(),
          street: street.trim(),
          town: town.trim(),
          postcode: postcode.trim()
        },
        businessHours: hours,
        verified: verified
      };

      const docRef = await addDoc(collection(db, "ar_locations"), pinData);
      
      const newPin: LocationPin = {
        id: docRef.id,
        ...pinData
      };

      setSaveSuccess(true);
      setTimeout(() => {
        onBusinessCreated(newPin);
      }, 1500);

    } catch (err: any) {
      console.error("Error saving business profile to Firestore: ", err);
      setErrorMsg(`Hitilafu imetokea wakati wa kuhifadhi: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0c1221] border border-slate-800/85 rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="google-business-setup-form">
      {/* Decorative top grid accent */}
      <div className="absolute -right-16 -top-16 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header and Step Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/25">
            <Store className="text-cyan-400 w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-wider uppercase font-display">
              {userLanguage === "sw" ? "Weka Biashara Maps" : "Add Business to Maps"}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              {userLanguage === "sw" ? "Mchakato wa Google Business Profile" : "Google Business Verification Wizard"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-black text-cyan-400">
            {step} / {totalSteps}
          </span>
          <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
            <div 
              className="bg-cyan-500 h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Error message slot */}
      {errorMsg && (
        <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step Components */}
      <div className="min-h-[280px] flex flex-col justify-center">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide leading-snug">
              {userLanguage === "sw" ? "Gundulika kwenye Google Search, Maps na Maeneo ya Karibu" : "Get your business discovered on Google Search, Maps and more"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {userLanguage === "sw" ? "Weka jina halisi la duka au ofisi yako ili wateja wakupate kwa urahisi." : "Enter a few business details to get started with your navigation placard."}
            </p>
            <div className="pt-2">
              <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                Jina la Biashara / Business name *
              </label>
              <input
                type="text"
                placeholder="mf. Trend Cycle, Soko la Kariakoo, nk."
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner font-bold"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? `Chagua aina ya biashara ya "${businessName}"` : `Choose your business type for "${businessName}"`}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Unaweza kuchagua zote zinazohusika na duka lako." : "Select all options that apply to your professional space."}
            </p>
            
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => toggleType("retail")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  types.includes("retail") 
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200" 
                    : "bg-[#0d1322] border-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide">Online retail</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Customers can purchase products through your website</p>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${types.includes("retail") ? "bg-cyan-500 border-cyan-400" : "border-slate-700"}`}>
                  {types.includes("retail") && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleType("store")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  types.includes("store") 
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200" 
                    : "bg-[#0d1322] border-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide">Local store</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Customers can visit your business in person</p>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${types.includes("store") ? "bg-cyan-500 border-cyan-400" : "border-slate-700"}`}>
                  {types.includes("store") && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleType("service")}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                  types.includes("service") 
                    ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200" 
                    : "bg-[#0d1322] border-slate-800 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide">Service business</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Your business makes visits or deliveries to customers</p>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${types.includes("service") ? "bg-cyan-500 border-cyan-400" : "border-slate-700"}`}>
                  {types.includes("service") && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Weka Kundi la Biashara yako (Category)" : "Enter a business category"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Hii inasaidia wateja kugundua tasnia yako kwa urahisi (mf. Plumber, Café, Hardware, Salon, nk.)." : "Help customers discover your business by industry by adding a primary business category."}
            </p>
            <div className="pt-2">
              <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                Kundi la Biashara / Business category *
              </label>
              <input
                type="text"
                placeholder="mf. Plumber, Boutique, Restaurant, nk."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                {userLanguage === "sw" ? "Unaweza kubadilisha na kuongeza mengine baadaye." : "You can change and add more categories later."}
              </span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Unahudumia Wateja wako Wapi? (Optional)" : "Where do you serve your customers? (optional)"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Ongeza maeneo ambayo biashara yako inafanya usambazaji, huduma za nyumbani au ofisini." : "Add areas where your business provides deliveries or home and office visits. This will appear on your Profile."}
            </p>
            <div className="pt-2">
              <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                Tafuta na uchague maeneo / Search and select areas
              </label>
              <input
                type="text"
                placeholder="mf. Dar es Salaam, Kariakoo, Ilala, Kinondoni"
                value={serviceAreas}
                onChange={(e) => setServiceAreas(e.target.value)}
                className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                {userLanguage === "sw" ? "Maeneo ya usambazaji au miji unayofikia." : "E.g., London, Dar es Salaam, Nairobi, Kampala."}
              </span>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Mawasiliano Gani ungependa kuonyesha?" : "What contact details do you want to show?"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Inasaidia wateja kukupigia simu au kutembelea tovuti yako." : "Help customers get in touch by including this info on your high-fidelity navigation card."}
            </p>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                  Namba ya Simu / Phone number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-3 text-cyan-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="mf. +255 712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                  Tovuti / Website (optional)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-3 text-cyan-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="mf. https://tovuti.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all shadow-inner font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Weka Biashara yako kwenye Ramani (GPS)" : "Put your business on the map"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Weka anwani ya kijiografia na eneo la GPS ili wateja waweze kuelekezwa kwa mshale wa 3D angani!" : "Enter your spatial address and pinpoint on the active radar coordinates."}
            </p>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1 font-display">
                  Anwani ya Mtaa / Street address *
                </label>
                <input
                  type="text"
                  placeholder="mf. Kariakoo, Mtaa wa Swahili, Plot 4"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1 font-display">
                  Mji / Town / City *
                </label>
                <input
                  type="text"
                  placeholder="mf. Dar es Salaam"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1 font-display">
                  Postcode / Postal Code
                </label>
                <input
                  type="text"
                  placeholder="mf. 11101"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>

              {/* Coordinates block with lock button */}
              <div className="col-span-2 bg-[#090d16] p-3 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-display">Spatials (GPS Coordinates)</span>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    className="flex items-center gap-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  >
                    <Compass className="w-3 h-3" />
                    Chukua GPS yangu sasa
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-6.8185"
                      value={lat}
                      onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#0d1322] border border-slate-850 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-700 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="39.2905"
                      value={lng}
                      onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-[#0d1322] border border-slate-850 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-700 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {currentGPS && (
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>GPS Sync Lock: {currentGPS.lat.toFixed(5)}, {currentGPS.lng.toFixed(5)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Weka Saa za Kazi (Business hours)" : "Add business hours"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Wajulishe wateja wako lini duka lako linakuwa wazi kwa huduma." : "Let customers know when your doors are active and open for visitation."}
            </p>
            
            <div className="space-y-2 pt-2 max-h-[190px] overflow-y-auto pr-1">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center justify-between bg-[#0d1322] p-2.5 rounded-xl border border-slate-850/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDayClosed(day)}
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        !hours[day].closed ? "bg-cyan-500 border-cyan-400" : "border-slate-700"
                      }`}
                    >
                      {!hours[day].closed && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                    </button>
                    <span className="text-xs font-bold text-slate-200">{day}</span>
                  </div>

                  {hours[day].closed ? (
                    <span className="text-[10px] font-black uppercase text-rose-400 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 font-display">Closed</span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                      <input
                        type="text"
                        value={hours[day].openTime}
                        onChange={(e) => handleTimeChange(day, "openTime", e.target.value)}
                        className="w-12 bg-slate-900 border border-slate-800 text-center rounded-md py-0.5"
                      />
                      <span>-</span>
                      <input
                        type="text"
                        value={hours[day].closeTime}
                        onChange={(e) => handleTimeChange(day, "closeTime", e.target.value)}
                        className="w-12 bg-slate-900 border border-slate-800 text-center rounded-md py-0.5"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Andika maelezo ya duka/ofisi yako" : "Add business description"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Wasaidie wateja kujua unatoa huduma zipi, bidhaa, na mambo ya kipekee kuhusu biashara yako." : "Let customers learn more about your business by writing a brief, custom welcoming bio."}
            </p>
            <div className="pt-2">
              <label className="block text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1.5 font-display">
                Maelezo ya Biashara (Upeo wa herufi 750)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 750))}
                rows={4}
                placeholder={userLanguage === "sw" ? "mf. Sisi ni wataalamu wa kuuza vifaa bora vya baiskeli na kutoa huduma ya matengenezo haraka..." : "e.g. Premium repair services and custom bicycle parts located in the heart of Dar es Salaam..."}
                className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all resize-none shadow-inner"
              />
              <div className="text-right text-[10px] text-slate-500 font-bold font-mono mt-1">
                {description.length} / 750
              </div>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Weka Picha ya Kazi au Bidhaa zako" : "Add photos of your work"}
            </h3>
            <p className="text-xs text-slate-400">
              {userLanguage === "sw" ? "Picha huwavutia wateja zaidi. Chagua picha mojawapo hapa au weka link ya picha yako." : "Visual cues are crucial for clients to recognize your storefront. Select an aesthetic preset below or paste a URL."}
            </p>
            
            <div className="grid grid-cols-3 gap-2 pt-2 max-h-[170px] overflow-y-auto pr-1">
              {PRESET_PHOTOS.map((preset, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setPhotoUrl(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                    photoUrl === preset.url ? "border-cyan-500 scale-[0.98]" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  title={preset.label}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  {photoUrl === preset.url && (
                    <div className="absolute inset-0 bg-cyan-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-[9px] uppercase tracking-wider font-black text-slate-500 mb-1">
                Au weka Kiungo cha Picha yako (Custom Image Link URL)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/picha-yako.jpg"
                className="w-full bg-[#0d1322] border border-slate-800 rounded-xl px-3 py-1.5 text-white placeholder-slate-700 text-[10px] focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="space-y-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            
            <h3 className="text-lg font-black text-white tracking-wide">
              {userLanguage === "sw" ? "Mabadiliko yataonekana ukishathibitisha!" : "Your edits will be visible once you're verified"}
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              {userLanguage === "sw" ? (
                "Kama duka rasmi kwenye ramani, tunapendekeza uthibitishe biashara yako ili kupata Beji Maalum ya Uhakiki ya Bluu (Blue Verification Checkmark) na kuwezesha wateja wako kuanza kuskani na kuelekezwa."
              ) : (
                "Get verified instantly to access full spatial metrics, rating tools, custom directions placard, and active radar tracking."
              )}
            </p>

            <div className="pt-3 max-w-xs mx-auto space-y-2">
              {verified ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs flex items-center justify-center gap-2 font-bold font-display uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>BIASHARA IMETHIBITISHWA!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstantVerification}
                  disabled={isVerifying}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider font-display cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Compass className="w-4 h-4 animate-spin" />
                      <span>Inathibitisha Eneno la GPS...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Thibitisha Sasa (Verify Instantly)</span>
                    </>
                  )}
                </button>
              )}

              {!verified && !isVerifying && (
                <button
                  type="button"
                  onClick={() => setVerified(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-bold block mx-auto underline cursor-pointer"
                >
                  Nitathibitisha Baadaye (Verify Later)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Controls Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || isSaving}
          className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Rudi (Back)</span>
        </button>

        {step < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500/15 to-blue-600/15 hover:from-cyan-500/25 hover:to-blue-600/25 text-cyan-400 border border-cyan-500/30 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <span>Endelea (Next)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveBusiness}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/10 active:scale-[0.99] disabled:opacity-50 uppercase tracking-wider font-display cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Inahifadhi...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Kamilifu!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Hifadhi Biashara (Save)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
