import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  MapPin, Phone, Clock, Search, ShieldAlert, Pill, 
  FlaskConical, Compass, Navigation, Sparkles, CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Facility {
  id: number;
  name: string;
  type: 'emergency' | 'pharmacy' | 'diagnostic';
  address: string;
  distance: string; // Calculated dynamically
  phone: string;
  hours: string;
  status: string;
  services: string[];
  lat: number;
  lng: number;
  ambulanceContact?: string;
}

// Real clinic coordinates in Bangalore near Begur / Bannerghatta Road / HSR Layout
const BANGALORE_FACILITIES: Facility[] = [
  {
    id: 1,
    name: "Jayashree Multi Speciality Hospital ER",
    type: "emergency",
    address: " Begur Main Road, near Begur Lake, Begur, Bengaluru, Karnataka 560068",
    distance: "Calculating...",
    phone: "+91 80 2574 3400",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["Level 2 Trauma Care", "Critical Emergency Unit", "24/7 Ambulance Dispatch"],
    lat: 12.8950,
    lng: 77.6350,
    ambulanceContact: "+91 99000 24000"
  },
  {
    id: 2,
    name: "Fortis Hospital Emergency ER",
    type: "emergency",
    address: "154/9, Bannerghatta Main Road, opposite IIMB, Bengaluru, Karnataka 560076",
    distance: "Calculating...",
    phone: "+91 80 6621 4444",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["Level 1 Cardiac Trauma", "Stroke Care Center", "24/7 Emergency ICU"],
    lat: 12.8965,
    lng: 77.5985,
    ambulanceContact: "+91 80 6621 4000"
  },
  {
    id: 3,
    name: "Apollo Pharmacy Begur",
    type: "pharmacy",
    address: "Begur Main Road, opposite City Supermarket, Begur, Bengaluru, Karnataka 560068",
    distance: "Calculating...",
    phone: "+91 80 4600 3211",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["24/7 Prescriptions", "OTC Medicines", "Home Delivery", "First Aid"],
    lat: 12.8920,
    lng: 77.6410
  },
  {
    id: 4,
    name: "MedPlus Pharmacy Begur Road",
    type: "pharmacy",
    address: "Begur Main Road, near Begur Police Station, Bengaluru, Karnataka 560068",
    distance: "Calculating...",
    phone: "+91 80 2574 8890",
    hours: "08:00 AM - 11:00 PM",
    status: "Open Now",
    services: ["Prescription Medicines", "Baby Care Products", "Diagnostics Collection"],
    lat: 12.8942,
    lng: 77.6365
  },
  {
    id: 5,
    name: "Anand Diagnostic Laboratory Begur",
    type: "diagnostic",
    address: "Begur Main Rd, near Vishwapriya Layout, Begur, Bengaluru, Karnataka 560068",
    distance: "Calculating...",
    phone: "+91 80 2553 5555",
    hours: "07:00 AM - 08:00 PM",
    status: "Open Now",
    services: ["Blood Panels & Tests", "Urine Chemistry", "Thyroid Profile"],
    lat: 12.8910,
    lng: 77.6430
  },
  {
    id: 6,
    name: "Aarthi Scans & Labs Bannerghatta",
    type: "diagnostic",
    address: "Bannerghatta Main Road, Phase 2, J. P. Nagar, Bengaluru, Karnataka 560076",
    distance: "Calculating...",
    phone: "+91 80 4550 5500",
    hours: "07:00 AM - 09:00 PM",
    status: "Open Now",
    services: ["MRI & CT Imaging Scans", "Ultrasound Scans", "Digital X-Ray"],
    lat: 12.9030,
    lng: 77.5950
  }
];

// Fallback to Begur, Bangalore coordinates if geolocation fails or is denied
const DEFAULT_COORDS = { lat: 12.8936, lng: 77.6382 };

export const FacilitiesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'emergency' | 'pharmacy' | 'diagnostic'>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>(BANGALORE_FACILITIES);
  const [selectedFacility, setSelectedFacility] = useState<Facility>(BANGALORE_FACILITIES[0]);
  const [navigationSteps, setNavigationSteps] = useState<{ distance: string; duration: string; instructions: string[] } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Map DOM Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  // 1. Fetch Browser Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          calculateDistances(loc.lat, loc.lng);
        },
        (err) => {
          console.warn("Geolocation denied or unavailable, falling back to Begur, Bangalore.", err);
          setLocationError("Using Begur, Bangalore as your location (Location access is blocked/denied).");
          setUserLocation(DEFAULT_COORDS);
          calculateDistances(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Defaulting to Begur, Bangalore.");
      setUserLocation(DEFAULT_COORDS);
      calculateDistances(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng);
    }
  }, []);

  // 2. Initialize and Update Leaflet Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || !userLocation) return;

    // Initialize map if not loaded
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([userLocation.lat, userLocation.lng], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      markersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    } else {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14);
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    // Clear previous markers
    markersGroup.clearLayers();

    // Custom Icon helper
    const createMarkerIcon = (color: string) => {
      return L.divIcon({
        className: 'custom-leaflet-pin',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); animate: ping 1.5s infinite"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
    };

    // User location pin (glowing blue)
    L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        className: 'user-leaflet-pin',
        html: `<div class="relative flex items-center justify-center h-4 w-4">
                 <div class="absolute h-4 w-4 bg-indigo-500 rounded-full animate-ping opacity-60"></div>
                 <div class="h-3 w-3 bg-indigo-600 rounded-full border border-white"></div>
               </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(markersGroup)
      .bindPopup("<b>You are here</b><br/>Begur, Bengaluru")
      .openPopup();

    // Plot all facility pins
    facilities.forEach(fac => {
      const isSelected = selectedFacility?.id === fac.id;
      const color = fac.type === 'emergency' ? '#ef4444' : fac.type === 'pharmacy' ? '#10b981' : '#6366f1';
      
      const marker = L.marker([fac.lat, fac.lng], {
        icon: L.divIcon({
          className: `facility-pin-${fac.id}`,
          html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: ${isSelected ? 'scale(1.3)' : 'none'}; transition: transform 0.2s"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      });

      marker.addTo(markersGroup)
        .bindPopup(`<b>${fac.name}</b><br/>${fac.address}<br/><span style="color: ${color}; font-weight: bold">${fac.status}</span>`)
        .on('click', () => {
          setSelectedFacility(fac);
        });
    });

  }, [userLocation, facilities, selectedFacility]);

  // 3. Haversine distance formula to calculate real-world distance
  const calculateDistances = (lat1: number, lon1: number) => {
    const calculated = BANGALORE_FACILITIES.map(fac => {
      const R = 6371; // radius in km
      const dLat = (fac.lat - lat1) * Math.PI / 180;
      const dLon = (fac.lng - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(fac.lat * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // distance in km
      return {
        ...fac,
        distance: d < 1 ? `${Math.round(d * 1000)} meters` : `${d.toFixed(1)} km`
      };
    });
    setFacilities(calculated);
  };

  // 4. Draw route lines dynamically on Leaflet map using OSRM API
  const handleGetDirections = async (facility: Facility) => {
    if (!userLocation) return;
    setSelectedFacility(facility);
    setIsNavigating(true);
    setNavigationSteps(null);

    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    // Clear existing route line
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    try {
      // Query Open Source Routing Machine (OSRM) driving API
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${facility.lng},${facility.lat}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]); // Swap to [lat, lng] for Leaflet

        // Draw dynamic polyline
        routeLineRef.current = L.polyline(coordinates, {
          color: '#4f46e5',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round'
        }).addTo(mapInstanceRef.current);

        // Fit map boundaries to fit route bounds
        mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [50, 50] });

        // Parse turn-by-turn routing logs
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMins = Math.round(route.duration / 60);
        
        const steps = route.legs[0].steps.map((step: any) => {
          const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
          return `${step.maneuver.type}${modifier} on ${step.name || 'local road'} (${Math.round(step.distance)} meters)`;
        });

        setNavigationSteps({
          distance: `${distanceKm} km`,
          duration: `${durationMins} mins`,
          instructions: steps.length > 0 ? steps : ["Head towards Begur main road to destination."]
        });
      }
    } catch (err) {
      console.error("OSRM Routing API failed", err);
    } finally {
      setIsNavigating(false);
    }
  };

  const filteredFacilities = facilities.filter(fac => {
    const matchesSearch = fac.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fac.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          fac.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || fac.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 p-1 font-sans">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-3xl text-white relative overflow-hidden border border-slate-800 shadow-xl animate-pop">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Real-time Geolocation Active
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Clinical Facilities Locator</h1>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
              Find emergency rooms, 24/7 pharmacies, and certified diagnostic imaging labs near your current location in Bangalore.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="h-5 w-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Position</p>
              <p className="text-xs font-bold text-slate-100 mt-0.5">
                {userLocation ? `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° W` : "Locating..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {locationError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-semibold">{locationError}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
        
        {/* Type Filter Buttons */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/50 w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Facilities
          </button>
          <button 
            onClick={() => setSelectedType('emergency')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'emergency' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Emergency (ER)
          </button>
          <button 
            onClick={() => setSelectedType('pharmacy')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'pharmacy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pill className="h-3.5 w-3.5" />
            Pharmacies
          </button>
          <button 
            onClick={() => setSelectedType('diagnostic')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedType === 'diagnostic' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Diagnostic Labs
          </button>
        </div>

        {/* Text Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by services or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Facilities List */}
        <div className="lg:col-span-7 space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredFacilities.length > 0 ? (
            filteredFacilities.map((fac) => (
              <Card 
                key={fac.id}
                variant="glass"
                onClick={() => setSelectedFacility(fac)}
                className={`p-6 border transition-all cursor-pointer duration-300 relative ${
                  selectedFacility?.id === fac.id 
                    ? 'border-indigo-600 shadow-md translate-x-1' 
                    : 'border-slate-200/65 hover:border-indigo-500/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${
                      fac.type === 'emergency' 
                        ? 'bg-rose-50 border-rose-200/50 text-rose-600'
                        : fac.type === 'pharmacy'
                        ? 'bg-emerald-50 border-emerald-200/50 text-emerald-600'
                        : 'bg-indigo-50 border-indigo-200/50 text-indigo-600'
                    }`}>
                      {fac.type === 'emergency' && <ShieldAlert className="h-5 w-5" />}
                      {fac.type === 'pharmacy' && <Pill className="h-5 w-5" />}
                      {fac.type === 'diagnostic' && <FlaskConical className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm md:text-base leading-snug">{fac.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${
                          fac.status === 'Open 24/7' || fac.status === 'Open Now'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          {fac.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {fac.distance} away
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 uppercase">
                    {fac.type}
                  </span>
                </div>

                {/* Info block */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {fac.address}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {fac.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {fac.hours}
                  </p>
                </div>

                {/* Ambulance details for Emergency */}
                {fac.type === 'emergency' && fac.ambulanceContact && (
                  <div className="mt-3 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs flex justify-between items-center font-bold">
                    <span>Emergency Ambulance: {fac.ambulanceContact}</span>
                    <a 
                      href={`tel:${fac.ambulanceContact.replace(/[^0-9+]/g, '')}`} 
                      className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[10px] hover:bg-rose-700 transition"
                    >
                      Call Now
                    </a>
                  </div>
                )}

                {/* Specialties / Services pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {fac.services.map((serv, index) => (
                    <span 
                      key={index}
                      className="text-[9px] font-semibold bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100"
                    >
                      {serv}
                    </span>
                  ))}
                </div>

                {/* Actions row */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <a 
                    href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Clinic
                  </a>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetDirections(fac);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigate Route
                  </button>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              No matching clinical facilities found.
            </div>
          )}
        </div>

        {/* Right Side: Real Leaflet Map Canvas */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Map Container */}
          <div className="w-full h-[400px] border border-slate-200 rounded-3xl overflow-hidden shadow-lg relative bg-slate-100">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
          </div>

          {/* Navigation HUD panel */}
          {navigationSteps && (
            <Card variant="glass" className="p-5 border-indigo-200/50 space-y-3 animate-pop">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600">
                    Live Route GPS HUD
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm mt-0.5">Turn-by-Turn Path</h4>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-indigo-600 block">{navigationSteps.distance}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{navigationSteps.duration} travel time</span>
                </div>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                {navigationSteps.instructions.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-[11px] text-slate-650">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="mt-0.5 leading-relaxed capitalize">{step.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Selected Facility Quick Summary */}
          {selectedFacility && (
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-2 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] opacity-20"></div>
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                    Selected Facility
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 mt-2">{selectedFacility.name}</h4>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-800 text-indigo-400">
                  {selectedFacility.distance}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 relative z-10">{selectedFacility.address}</p>
              <div className="flex items-center gap-3 pt-2 text-[10px] font-bold relative z-10">
                <span className="text-emerald-400">● {selectedFacility.status}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-350">{selectedFacility.phone}</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
