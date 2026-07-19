import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  MapPin, Phone, Clock, Search, ShieldAlert, Pill, 
  FlaskConical, Compass, ExternalLink, Navigation, 
  Sparkles, CheckCircle2 
} from 'lucide-react';

interface Facility {
  id: number;
  name: string;
  type: 'emergency' | 'pharmacy' | 'diagnostic';
  address: string;
  distance: string;
  phone: string;
  hours: string;
  status: 'Open 24/7' | 'Open Now' | 'Closed';
  services: string[];
  lat: number;
  lng: number;
}

const MOCK_FACILITIES: Facility[] = [
  {
    id: 1,
    name: "City General Hospital ER",
    type: "emergency",
    address: "100 Medical Plaza, Sector 12",
    distance: "0.8 miles",
    phone: "+1 (555) 911-0100",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["Level 1 Trauma", "Cardiac Care", "Pediatric ER", "24/7 Labs"],
    lat: 40.7128,
    lng: -74.0060
  },
  {
    id: 2,
    name: "Metro Emergency Trauma Center",
    type: "emergency",
    address: "450 Health Ave, Sector 5",
    distance: "2.4 miles",
    phone: "+1 (555) 911-0250",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["Stroke Care Center", "Burn Treatment", "Emergency Imaging"],
    lat: 40.7250,
    lng: -74.0120
  },
  {
    id: 3,
    name: "RxCare 24/7 Pharmacy",
    type: "pharmacy",
    address: "202 Wellness Boulevard",
    distance: "0.4 miles",
    phone: "+1 (555) 321-4500",
    hours: "24 Hours / 7 Days",
    status: "Open 24/7",
    services: ["Prescription Refills", "Vaccinations", "Home Delivery", "OTC Medicines"],
    lat: 40.7100,
    lng: -74.0010
  },
  {
    id: 4,
    name: "Avenue Wellness Pharmacy",
    type: "pharmacy",
    address: "788 Broad Street",
    distance: "1.5 miles",
    phone: "+1 (555) 321-4890",
    hours: "08:00 AM - 10:00 PM",
    status: "Open Now",
    services: ["Prescription Compounding", "Medical Equipment", "Durable Care"],
    lat: 40.7180,
    lng: -74.0150
  },
  {
    id: 5,
    name: "Apex Diagnostic Laboratories",
    type: "diagnostic",
    address: "310 LabTech Way, Suite 10",
    distance: "1.1 miles",
    phone: "+1 (555) 789-3000",
    hours: "07:00 AM - 06:00 PM",
    status: "Open Now",
    services: ["MRI & CT Scans", "Ultrasound", "Blood Panels", "X-Ray"],
    lat: 40.7150,
    lng: -74.0090
  },
  {
    id: 6,
    name: "Pathology Core Lab Center",
    type: "diagnostic",
    address: "512 Science Parkway",
    distance: "3.2 miles",
    phone: "+1 (555) 789-3550",
    hours: "08:00 AM - 05:00 PM",
    status: "Open Now",
    services: ["Genetic Testing", "Biopsies", "Allergy Testing", "Covid-19 Screening"],
    lat: 40.7300,
    lng: -74.0200
  }
];

export const FacilitiesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'emergency' | 'pharmacy' | 'diagnostic'>('all');
  const [selectedFacility, setSelectedFacility] = useState<Facility>(MOCK_FACILITIES[0]);
  const [routeInfo, setRouteInfo] = useState<string | null>(null);

  const filteredFacilities = MOCK_FACILITIES.filter(fac => {
    const matchesSearch = fac.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fac.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          fac.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || fac.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleGetDirections = (facility: Facility) => {
    setSelectedFacility(facility);
    setRouteInfo(`Generating optimal clinical route to ${facility.name}. Head North-West on 5th Ave for 0.4 miles, then turn right on Wellness Boulevard.`);
    setTimeout(() => {
      setRouteInfo(null);
    }, 8000);
  };

  return (
    <div className="space-y-8 p-1 font-sans">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-3xl text-white relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.15),transparent)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Live Geolocation Active
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Clinical Facilities Locator</h1>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
              Find emergency rooms, 24/7 pharmacies, and certified diagnostic imaging labs near your current location.
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Compass className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Coordinates</p>
              <p className="text-xs font-bold text-slate-100 mt-0.5">40.7128° N, 74.0060° W</p>
            </div>
          </div>
        </div>
      </div>

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

      {routeInfo && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-xs font-semibold">{routeInfo}</p>
        </div>
      )}

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
                  selectedFacility.id === fac.id 
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
                    Call
                  </a>
                  <button 
                    onClick={() => handleGetDirections(fac)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Navigate
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

        {/* Right Side: High-tech Map Canvas */}
        <div className="lg:col-span-5 h-[600px]">
          <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden flex flex-col justify-between p-6 shadow-lg">
            
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Pulsing Radar Ring Animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-indigo-500/5 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full border border-indigo-500/10"></div>
            
            {/* Radar Sweeper */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-dashed border-indigo-500/20 rounded-full animate-spin" style={{ animationDuration: '10s' }}></div>

            {/* Header info */}
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  Clinical Map HUD
                </span>
                <h3 className="font-bold text-slate-100 text-sm mt-1.5">Interactive Plot</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400">Scale: 1 : 24,000</span>
              </div>
            </div>

            {/* Center User Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="h-6 w-6 rounded-full bg-indigo-600/30 border border-indigo-500 flex items-center justify-center animate-ping absolute"></div>
              <div className="h-4 w-4 rounded-full bg-indigo-500 border-2 border-white shadow-md relative z-10"></div>
              <span className="text-[9px] font-extrabold text-indigo-300 mt-1 drop-shadow bg-slate-900/80 px-1 rounded">
                You
              </span>
            </div>

            {/* Render Mock Facilities Pins */}
            {filteredFacilities.map((fac) => {
              // Map mock lat/lng coordinates relative offsets to center of 500x500 box
              // Center coordinates: 40.7128, -74.0060
              const offsetLat = ((fac.lat - 40.7128) * 1800) + 50; // percent based offset
              const offsetLng = ((fac.lng - (-74.0060)) * 1800) + 50;

              const isSelected = selectedFacility.id === fac.id;

              return (
                <div 
                  key={fac.id}
                  onClick={() => setSelectedFacility(fac)}
                  className="absolute cursor-pointer transition-all duration-300 flex flex-col items-center group z-10"
                  style={{ 
                    top: `${offsetLat}%`, 
                    left: `${offsetLng}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isSelected ? 'scale-125 scale-125 z-20' : 'hover:scale-110'
                  } ${
                    fac.type === 'emergency' 
                      ? 'bg-rose-500 text-white' 
                      : fac.type === 'pharmacy'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-500 text-white'
                  }`}>
                    {fac.type === 'emergency' && <ShieldAlert className="h-3 w-3" />}
                    {fac.type === 'pharmacy' && <Pill className="h-3 w-3" />}
                    {fac.type === 'diagnostic' && <FlaskConical className="h-3 w-3" />}
                  </div>

                  {/* Pulsing Ring for Selected Pin */}
                  {isSelected && (
                    <div className={`absolute -inset-1 rounded-full animate-ping opacity-60 ${
                      fac.type === 'emergency' ? 'bg-rose-500' : fac.type === 'pharmacy' ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}></div>
                  )}

                  {/* Hover Label */}
                  <span className={`text-[8px] font-bold mt-1 px-1.5 py-0.5 rounded whitespace-nowrap opacity-80 transition-all ${
                    isSelected 
                      ? 'bg-slate-900 text-slate-100 border border-slate-700' 
                      : 'bg-slate-950/80 text-slate-400 group-hover:opacity-100'
                  }`}>
                    {fac.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}

            {/* Selected HUD Box */}
            <div className="relative z-10 bg-slate-950/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 space-y-2 mt-auto">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-200">{selectedFacility.name}</h4>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-400">
                  {selectedFacility.distance}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{selectedFacility.address}</p>
              <div className="flex items-center gap-3 pt-2 text-[10px] font-bold">
                <span className={selectedFacility.status === 'Closed' ? 'text-rose-400' : 'text-emerald-400'}>
                  ● {selectedFacility.status}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">{selectedFacility.phone}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
