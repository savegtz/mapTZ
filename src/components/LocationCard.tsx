import React, { useEffect, useState } from "react";
import { 
  Compass, Copy, Check, Printer, Landmark, Trash2, Calendar, Star, Clock, Zap,
  Store, Phone, Globe, ShieldAlert, ShieldCheck, BarChart3, MessageSquare, Image,
  AlertTriangle, Eye, Navigation, ChevronDown, ChevronUp
} from "lucide-react";
import { LocationPin } from "../types";
import QRCode from "qrcode";
import { db } from "../lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

interface LocationCardProps {
  pin: LocationPin;
  currentGPS?: { lat: number; lng: number } | null;
  onNavigate: (pin: LocationPin) => void;
  onDelete: (id: string) => void;
  userLanguage?: "sw" | "en";
  key?: React.Key;
}

// Haversine formula to compute exact distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

export default function LocationCard({ pin, currentGPS, onNavigate, onDelete, userLanguage = "sw" }: LocationCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Business Dashboard States
  const [activeBizTab, setActiveBizTab] = useState<"summary" | "reviews" | "performance" | "hours">("summary");
  const [showBizHours, setShowBizHours] = useState(false);
  const [isVerifyingBiz, setIsVerifyingBiz] = useState(false);
  const [bizVerified, setBizVerified] = useState(pin.verified || false);

  const deepLinkUrl = `${window.location.origin}?nav=${pin.id}`;

  const handleVerifyBusiness = async () => {
    setIsVerifyingBiz(true);
    try {
      await updateDoc(doc(db, "ar_locations", pin.id), { verified: true });
      setBizVerified(true);
    } catch (err) {
      console.error("Error verifying business:", err);
    } finally {
      setIsVerifyingBiz(false);
    }
  };

  // Deterministic simulation stats based on pin ID to ensure visual stability and beauty
  const charSum = pin.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rating = (4.5 + (charSum % 5) * 0.1).toFixed(1);
  const trafficLevel = charSum % 3 === 0 ? "Heavy" : charSum % 3 === 1 ? "Moderate" : "Light";
  const trafficColor = trafficLevel === "Heavy" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : trafficLevel === "Moderate" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  const statusLabel = charSum % 2 === 0 ? "OPEN NOW" : "SYNC COMPLETE";
  const statusColor = charSum % 2 === 0 ? "text-cyan-400 border-cyan-500/30" : "text-indigo-400 border-indigo-500/30";
  const tagPill = charSum % 3 === 0 ? "URBAN" : charSum % 3 === 1 ? "FREQUENT" : "EXPRESS";

  // Calculate real distance if GPS is active
  const distanceInMeters = currentGPS
    ? calculateDistance(currentGPS.lat, currentGPS.lng, pin.latitude, pin.longitude)
    : null;

  const distanceText = distanceInMeters !== null
    ? distanceInMeters > 1000
      ? `${(distanceInMeters / 1000).toFixed(2)} km`
      : `${distanceInMeters} meters`
    : `${(0.4 + (charSum % 8) * 0.2).toFixed(1)} km (Est.)`;

  useEffect(() => {
    // Generate high contrast QR code for dark UI background
    QRCode.toDataURL(deepLinkUrl, {
      width: 250,
      margin: 1,
      color: {
        dark: "#0a0f1d", // rich dark navy
        light: "#ffffff" // white background for clear scanning
      }
    })
      .then((url) => {
        setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error("Error generating QR code:", err);
      });
  }, [pin.id, deepLinkUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    const confirmationMsg = userLanguage === "sw" 
      ? `Je, una uhakika unataka kufuta eneo la "${pin.name}"?`
      : `Are you sure you want to delete the location "${pin.name}"?`;
      
    if (window.confirm(confirmationMsg)) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, "ar_locations", pin.id));
        onDelete(pin.id);
      } catch (err) {
        console.error("Error deleting location from Firestore:", err);
        alert(userLanguage === "sw" ? "Hitilafu imetokea wakati wa kufuta eneo." : "Error occurred while deleting location.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handlePrintCard = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>AR Navigation Code - ${pin.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 40px;
              color: #0f172a;
              text-align: center;
              background-color: #080b10;
              color: #ffffff;
            }
            .card {
              max-width: 480px;
              margin: 0 auto;
              border: 2px solid #00e5ff;
              border-radius: 24px;
              padding: 32px;
              background-color: #0f172a;
              box-shadow: 0 15px 35px rgba(0, 229, 255, 0.15);
            }
            .badge {
              background-color: #00e5ff;
              color: #080b10;
              padding: 6px 14px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: inline-block;
            }
            h1 {
              font-size: 26px;
              margin: 20px 0 8px 0;
              font-weight: 800;
              color: #ffffff;
            }
            p.description {
              font-size: 14px;
              color: #94a3b8;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            .qr-container {
              background-color: #ffffff;
              padding: 16px;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 24px;
            }
            .qr-image {
              width: 220px;
              height: 220px;
              display: block;
            }
            .footer {
              font-size: 12px;
              color: #00e5ff;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .url-text {
              font-family: monospace;
              background-color: rgba(0,0,0,0.3);
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 11px;
              word-break: break-all;
              margin-top: 16px;
              color: #94a3b8;
              border: 1px solid rgba(255,255,255,0.05);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">NAV_PULSE AR DRIVER</div>
            <h1>📍 ${pin.name}</h1>
            <p class="description">${pin.description || "Scan this QR Code to launch real-time 3D AR navigation guidance directly on your screen."}</p>
            <div class="qr-container">
              <img class="qr-image" src="${qrCodeUrl}" alt="Scan QR Code" />
            </div>
            <div class="footer">CAMERA AUTOMATICALLY STARTS WITH FLOAT POINTER</div>
            <div class="url-text">${deepLinkUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formattedDate = new Date(pin.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div 
      className="bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/30 rounded-3xl p-5 shadow-2xl transition-all duration-300 flex flex-col md:flex-row gap-5 relative overflow-hidden group" 
      id={`location-card-${pin.id}`}
    >
      {/* Visual reference code QR Column */}
      <div className="flex flex-col items-center justify-center bg-[#090d16] p-4 rounded-2xl border border-slate-800/60 shrink-0 relative">
        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping pointer-events-none opacity-40"></div>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="QR Code Link" className="w-32 h-32 bg-white p-2.5 rounded-xl shadow-inner transition-transform group-hover:scale-105 duration-300" />
        ) : (
          <div className="w-32 h-32 bg-slate-950 rounded-xl animate-pulse"></div>
        )}
        <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider mt-3.5 flex items-center gap-1 font-display">
          <Zap className="w-3 h-3 text-cyan-400" />
          AR SCANNER SYNC
        </span>
      </div>

      {/* Contents and operations column */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-750">
                  {tagPill}
                </span>
                <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md border ${trafficColor}`}>
                  TRAFFIC: {trafficLevel.toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2 font-display">
                <Landmark className="w-5 h-5 text-cyan-400 shrink-0" />
                {pin.name}
              </h3>
            </div>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all active:scale-95"
              title={userLanguage === "sw" ? "Futa eneo" : "Delete location"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed font-sans">
            {pin.description || (userLanguage === "sw" ? "Hakuna maelezo ya ziada yaliyowekwa." : "No additional description set.")}
          </p>

          <div className="flex items-center gap-3.5 mt-4 text-[11px] text-slate-400 font-bold font-mono flex-wrap">
            <div className="flex items-center gap-1 text-slate-200">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>{distanceText}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-amber-300">{rating} Rating</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Card Operations row */}
        <div className="grid grid-cols-3 gap-2 mt-4.5 pt-4 border-t border-slate-800/60">
          <button
            onClick={() => onNavigate(pin)}
            className="col-span-2 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-3 px-3 rounded-xl transition-all shadow-lg shadow-cyan-500/10 active:scale-95 uppercase tracking-wider font-display cursor-pointer"
          >
            <Compass className="w-4 h-4 animate-spin-slow text-slate-950" />
            {userLanguage === "sw" ? "Fungua AR Kamera" : "Start AR Navigation"}
          </button>
          
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 py-3 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-inner"
            title="Nakili Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? (userLanguage === "sw" ? "Safi" : "Copied") : (userLanguage === "sw" ? "Nakili" : "Copy")}</span>
          </button>
        </div>

        {/* Advanced printable trigger */}
        <button
          onClick={handlePrintCard}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 hover:border-slate-700 text-[9px] uppercase tracking-widest text-slate-400 font-black rounded-xl transition-all cursor-pointer font-display"
        >
          <Printer className="w-3.5 h-3.5 text-cyan-400" />
          {userLanguage === "sw" ? "Tengeneza Kadi ya Kuchapisha (Print QR)" : "Generate Printable Placard (Print QR)"}
        </button>
      </div>
    </div>
  );
}
