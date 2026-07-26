import React, { useState } from "react";
import { 
  Sun, 
  Sunrise, 
  Sunset, 
  CloudSun, 
  Wind, 
  Droplets, 
  RefreshCw, 
  MapPin, 
  ShieldAlert, 
  Eye, 
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface CityWeatherData {
  cityName: string;
  country: string;
  tempCurrent: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  visibility: string;
  aqi: {
    value: number;
    status: "Good" | "Moderate" | "Unhealthy" | "Very Unhealthy" | "Hazardous";
    pm25: number;
    pm10: number;
    color: string;
  };
  sunTimes: {
    sunrise: string;
    sunset: string;
    dayLength: string;
  };
}

const CITIES_WEATHER: Record<string, CityWeatherData> = {
  "Kolkata": {
    cityName: "Kolkata",
    country: "India",
    tempCurrent: 31,
    feelsLike: 35,
    condition: "Partly Cloudy",
    humidity: 72,
    windSpeed: 12,
    uvIndex: 7,
    visibility: "8 km",
    aqi: {
      value: 68,
      status: "Moderate",
      pm25: 22.4,
      pm10: 48.1,
      color: "text-amber-400 bg-amber-400/10 border-amber-400/30"
    },
    sunTimes: {
      sunrise: "05:08 AM",
      sunset: "06:22 PM",
      dayLength: "13 hrs 14 mins"
    }
  },
  "Delhi": {
    cityName: "New Delhi",
    country: "India",
    tempCurrent: 34,
    feelsLike: 39,
    condition: "Sunny / Haze",
    humidity: 58,
    windSpeed: 10,
    uvIndex: 8,
    visibility: "5 km",
    aqi: {
      value: 142,
      status: "Unhealthy",
      pm25: 58.2,
      pm10: 112.5,
      color: "text-orange-400 bg-orange-400/10 border-orange-400/30"
    },
    sunTimes: {
      sunrise: "05:38 AM",
      sunset: "07:18 PM",
      dayLength: "13 hrs 40 mins"
    }
  },
  "London": {
    cityName: "London",
    country: "United Kingdom",
    tempCurrent: 22,
    feelsLike: 22,
    condition: "Partly Cloudy",
    humidity: 52,
    windSpeed: 15,
    uvIndex: 5,
    visibility: "10 km",
    aqi: {
      value: 32,
      status: "Good",
      pm25: 7.8,
      pm10: 14.2,
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    },
    sunTimes: {
      sunrise: "05:12 AM",
      sunset: "08:58 PM",
      dayLength: "15 hrs 46 mins"
    }
  },
  "New York": {
    cityName: "New York",
    country: "United States",
    tempCurrent: 28,
    feelsLike: 30,
    condition: "Clear Sky",
    humidity: 48,
    windSpeed: 11,
    uvIndex: 7,
    visibility: "10 km",
    aqi: {
      value: 42,
      status: "Good",
      pm25: 10.1,
      pm10: 18.5,
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
    },
    sunTimes: {
      sunrise: "05:48 AM",
      sunset: "08:21 PM",
      dayLength: "14 hrs 33 mins"
    }
  }
};

interface WeatherPanelProps {
  onAddLog?: (type: "info" | "voice" | "error" | "warn" | "device", message: string) => void;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ onAddLog }) => {
  const [selectedCityKey, setSelectedCityKey] = useState<string>("Kolkata");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Just now");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(true);

  const weather = CITIES_WEATHER[selectedCityKey] || CITIES_WEATHER["Kolkata"];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastRefreshed(timeStr);
      if (onAddLog) {
        onAddLog("info", `Updated environmental forecast for ${weather.cityName}.`);
      }
    }, 600);
  };

  return (
    <div className="w-full bg-[#11131f]/60 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
      
      {/* Master Collapsible Dropdown Header */}
      <div 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full p-3.5 sm:p-4 bg-slate-900/90 hover:bg-slate-900 transition-colors border-b border-white/10 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
            <CloudSun className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
              Environmental Forecast & AQI
            </h3>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Live Air Quality, Humidity, Wind & Solar Metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* City Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-white/15 rounded-xl px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedCityKey}
              onChange={(e) => {
                setSelectedCityKey(e.target.value);
                if (onAddLog) {
                  onAddLog("info", `Switched location to ${e.target.value}`);
                }
              }}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              {Object.keys(CITIES_WEATHER).map((key) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {CITIES_WEATHER[key].cityName}, {CITIES_WEATHER[key].country}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh environmental data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Collapsible Dropdown Arrow */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
          >
            {isDropdownOpen ? (
              <>
                <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Content Area */}
      {isDropdownOpen && (
        <div className="p-3.5 sm:p-5 flex flex-col gap-4 animate-fadeIn">
          
          {/* Main Forecast & AQI Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Environmental Forecast Card */}
            <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-950 border border-cyan-500/20 rounded-xl p-4 flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Title & Temperature Header */}
              <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {weather.cityName}, {weather.country}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5 shrink-0">
                    Refreshed {lastRefreshed}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
                    {weather.tempCurrent}°C
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Feels like {weather.feelsLike}°C
                  </span>
                </div>

                <div className="inline-self-start">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-500/20">
                    {weather.condition}
                  </span>
                </div>
              </div>

              {/* Environmental Metrics in Stacked Rows */}
              <div className="flex flex-col gap-2 pt-3 border-t border-white/10 relative z-10">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Environmental Conditions
                </span>

                {/* Humidity Row */}
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium truncate">Humidity</span>
                  </div>
                  <span className="font-bold text-slate-100 font-mono text-xs shrink-0 whitespace-nowrap">{weather.humidity}%</span>
                </div>

                {/* Wind Row */}
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wind className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium truncate">Wind Speed</span>
                  </div>
                  <span className="font-bold text-slate-100 font-mono text-xs shrink-0 whitespace-nowrap">{weather.windSpeed} km/h</span>
                </div>

                {/* Visibility Row */}
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium truncate">Visibility</span>
                  </div>
                  <span className="font-bold text-slate-100 font-mono text-xs shrink-0 whitespace-nowrap">{weather.visibility}</span>
                </div>
              </div>
            </div>

            {/* Air Quality Index (AQI) Card */}
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 gap-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 truncate">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Air Quality Index (AQI)
                </span>
                <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${weather.aqi.color}`}>
                  {weather.aqi.status}
                </span>
              </div>

              {/* AQI Breakdown in Stacked Rows */}
              <div className="flex flex-col gap-2 my-1">
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 truncate">AQI Score (US Scale)</span>
                  <span className="font-black text-white font-mono text-sm shrink-0 whitespace-nowrap">{weather.aqi.value}</span>
                </div>

                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 truncate">PM2.5 Level</span>
                  <span className="font-bold text-amber-300 font-mono text-xs shrink-0 whitespace-nowrap">{weather.aqi.pm25} µg/m³</span>
                </div>

                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-xs text-slate-400 truncate">PM10 Level</span>
                  <span className="font-bold text-orange-300 font-mono text-xs shrink-0 whitespace-nowrap">{weather.aqi.pm10} µg/m³</span>
                </div>
              </div>

              {/* AQI Indicator Bar */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-emerald-400" style={{ width: '20%' }} title="Good (0-50)" />
                  <div className="h-full bg-amber-400" style={{ width: '20%' }} title="Moderate (51-100)" />
                  <div className="h-full bg-orange-400" style={{ width: '20%' }} title="Unhealthy for Sensitive (101-150)" />
                  <div className="h-full bg-rose-500" style={{ width: '20%' }} title="Unhealthy (151-200)" />
                  <div className="h-full bg-purple-600" style={{ width: '20%' }} title="Very Unhealthy (201+)" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>0 (Good)</span>
                  <span>500 (Hazardous)</span>
                </div>
              </div>
            </div>

          </div>

          {/* Sunrise, Sunset & Daylight Banner */}
          <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            
            {/* Sunrise Row */}
            <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-amber-500/15 rounded-lg text-amber-400 shrink-0">
                  <Sunrise className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300 truncate">Sunrise</span>
              </div>
              <span className="text-xs font-bold text-amber-300 font-mono shrink-0 whitespace-nowrap ml-2">{weather.sunTimes.sunrise}</span>
            </div>

            {/* Sunset Row */}
            <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/20 px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-400 shrink-0">
                  <Sunset className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300 truncate">Sunset</span>
              </div>
              <span className="text-xs font-bold text-indigo-300 font-mono shrink-0 whitespace-nowrap ml-2">{weather.sunTimes.sunset}</span>
            </div>

            {/* Daylight Duration Row */}
            <div className="flex items-center justify-between bg-cyan-500/5 border border-cyan-500/20 px-3 py-2.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400 shrink-0">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-300 truncate">Daylight</span>
              </div>
              <span className="text-xs font-bold text-cyan-300 font-mono shrink-0 whitespace-nowrap ml-2">{weather.sunTimes.dayLength}</span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
