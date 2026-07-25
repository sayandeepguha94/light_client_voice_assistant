import React, { useState, useEffect } from "react";
import { 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset, 
  Cloud, 
  CloudRain, 
  CloudSun, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Thermometer, 
  RefreshCw, 
  MapPin, 
  ShieldAlert, 
  Eye, 
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface DayForecast {
  day: string;
  date: string;
  condition: "sunny" | "cloudy" | "partly_cloudy" | "rainy" | "thunderstorm";
  tempHigh: number;
  tempLow: number;
  pop: number; // probability of precipitation %
  humidity: number;
}

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
  forecast: DayForecast[];
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
    },
    forecast: [
      { day: "Today", date: "Jul 25", condition: "partly_cloudy", tempHigh: 32, tempLow: 26, pop: 30, humidity: 72 },
      { day: "Tomorrow", date: "Jul 26", condition: "rainy", tempHigh: 30, tempLow: 25, pop: 80, humidity: 85 },
      { day: "Sun", date: "Jul 27", condition: "thunderstorm", tempHigh: 29, tempLow: 24, pop: 90, humidity: 88 },
      { day: "Mon", date: "Jul 28", condition: "rainy", tempHigh: 31, tempLow: 25, pop: 60, humidity: 80 },
      { day: "Tue", date: "Jul 29", condition: "partly_cloudy", tempHigh: 33, tempLow: 26, pop: 20, humidity: 70 },
      { day: "Wed", date: "Jul 30", condition: "sunny", tempHigh: 34, tempLow: 27, pop: 10, humidity: 65 },
      { day: "Thu", date: "Jul 31", condition: "partly_cloudy", tempHigh: 33, tempLow: 26, pop: 25, humidity: 68 },
    ]
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
    },
    forecast: [
      { day: "Today", date: "Jul 25", condition: "sunny", tempHigh: 36, tempLow: 28, pop: 10, humidity: 58 },
      { day: "Tomorrow", date: "Jul 26", condition: "partly_cloudy", tempHigh: 35, tempLow: 27, pop: 20, humidity: 62 },
      { day: "Sun", date: "Jul 27", condition: "rainy", tempHigh: 32, tempLow: 26, pop: 70, humidity: 78 },
      { day: "Mon", date: "Jul 28", condition: "thunderstorm", tempHigh: 31, tempLow: 25, pop: 85, humidity: 82 },
      { day: "Tue", date: "Jul 29", condition: "partly_cloudy", tempHigh: 33, tempLow: 26, pop: 30, humidity: 70 },
      { day: "Wed", date: "Jul 30", condition: "sunny", tempHigh: 35, tempLow: 27, pop: 15, humidity: 60 },
      { day: "Thu", date: "Jul 31", condition: "sunny", tempHigh: 36, tempLow: 28, pop: 10, humidity: 55 },
    ]
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
    },
    forecast: [
      { day: "Today", date: "Jul 25", condition: "partly_cloudy", tempHigh: 23, tempLow: 14, pop: 15, humidity: 52 },
      { day: "Tomorrow", date: "Jul 26", condition: "sunny", tempHigh: 25, tempLow: 15, pop: 5, humidity: 48 },
      { day: "Sun", date: "Jul 27", condition: "partly_cloudy", tempHigh: 24, tempLow: 14, pop: 20, humidity: 55 },
      { day: "Mon", date: "Jul 28", condition: "rainy", tempHigh: 20, tempLow: 13, pop: 75, humidity: 72 },
      { day: "Tue", date: "Jul 29", condition: "cloudy", tempHigh: 21, tempLow: 13, pop: 40, humidity: 65 },
      { day: "Wed", date: "Jul 30", condition: "sunny", tempHigh: 24, tempLow: 14, pop: 10, humidity: 50 },
      { day: "Thu", date: "Jul 31", condition: "partly_cloudy", tempHigh: 23, tempLow: 14, pop: 15, humidity: 53 },
    ]
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
    },
    forecast: [
      { day: "Today", date: "Jul 25", condition: "sunny", tempHigh: 29, tempLow: 21, pop: 5, humidity: 48 },
      { day: "Tomorrow", date: "Jul 26", condition: "partly_cloudy", tempHigh: 30, tempLow: 22, pop: 20, humidity: 52 },
      { day: "Sun", date: "Jul 27", condition: "thunderstorm", tempHigh: 27, tempLow: 20, pop: 80, humidity: 75 },
      { day: "Mon", date: "Jul 28", condition: "sunny", tempHigh: 28, tempLow: 19, pop: 10, humidity: 50 },
      { day: "Tue", date: "Jul 29", condition: "sunny", tempHigh: 30, tempLow: 21, pop: 5, humidity: 45 },
      { day: "Wed", date: "Jul 30", condition: "partly_cloudy", tempHigh: 31, tempLow: 22, pop: 25, humidity: 55 },
      { day: "Thu", date: "Jul 31", condition: "rainy", tempHigh: 26, tempLow: 19, pop: 65, humidity: 70 },
    ]
  }
};

interface WeatherPanelProps {
  onAddLog?: (type: "info" | "voice" | "error" | "warn" | "device", message: string) => void;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ onAddLog }) => {
  const [selectedCityKey, setSelectedCityKey] = useState<string>("Kolkata");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("Just now");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(-1); // -1 = Hidden/Collapsed
  const [isDropdownExpanded, setIsDropdownExpanded] = useState<boolean>(false);

  const weather = CITIES_WEATHER[selectedCityKey] || CITIES_WEATHER["Kolkata"];
  const selectedDayForecast = selectedDayIndex >= 0 ? weather.forecast[selectedDayIndex] : null;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastRefreshed(timeStr);
      if (onAddLog) {
        onAddLog("info", `Updated weather and AQI forecast for ${weather.cityName}.`);
      }
    }, 600);
  };

  const getWeatherIcon = (condition: DayForecast["condition"], className: string = "w-5 h-5") => {
    switch (condition) {
      case "sunny":
        return <Sun className={`${className} text-amber-400 animate-spin-slow`} />;
      case "partly_cloudy":
        return <CloudSun className={`${className} text-cyan-400`} />;
      case "cloudy":
        return <Cloud className={`${className} text-slate-400`} />;
      case "rainy":
        return <CloudRain className={`${className} text-blue-400`} />;
      case "thunderstorm":
        return <CloudLightning className={`${className} text-purple-400`} />;
      default:
        return <Sun className={`${className} text-amber-400`} />;
    }
  };

  const getConditionLabel = (condition: DayForecast["condition"]) => {
    switch (condition) {
      case "sunny": return "Sunny & Clear";
      case "partly_cloudy": return "Partly Cloudy";
      case "cloudy": return "Overcast / Cloudy";
      case "rainy": return "Rain & Showers";
      case "thunderstorm": return "Thunderstorm Alert";
      default: return condition;
    }
  };

  const getWeatherTip = (day: DayForecast) => {
    if (day.condition === "thunderstorm") return "⚡ Lightning & heavy thunder expected. Secure outdoor smart devices.";
    if (day.pop >= 70) return "🌧️ High rain chance! Remember to bring an umbrella and check window sensors.";
    if (day.pop >= 30) return "🌦️ Scattered light rain possible. Great day to schedule automated indoor routines.";
    if (day.tempHigh >= 35) return "🌡️ High heat wave! HVAC climate control will automatically run eco-cooling.";
    if (day.condition === "sunny") return "☀️ Clear skies! High solar power potential for green energy storage.";
    return "🌤️ Mild weather conditions expected throughout the day.";
  };

  return (
    <div className="w-full bg-[#11131f]/50 backdrop-blur-md border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col gap-5 shadow-2xl">
      
      {/* Top Header & City Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl text-cyan-400">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Environmental Forecast & AQI
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              7-DAY WEATHER, AIR QUALITY, SUNRISE & SUNSET
            </p>
          </div>
        </div>

        {/* City Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedCityKey}
              onChange={(e) => {
                setSelectedCityKey(e.target.value);
                if (onAddLog) {
                  onAddLog("info", `Switched weather location to ${e.target.value}`);
                }
              }}
              className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {Object.keys(CITIES_WEATHER).map((key) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {CITIES_WEATHER[key].cityName}, {CITIES_WEATHER[key].country}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh weather data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Temperature & AQI Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Current Weather Card (7 cols) */}
        <div className="md:col-span-7 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-950/80 border border-cyan-500/20 rounded-xl p-4 flex flex-col justify-between gap-4 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Location & Temp */}
          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {weather.cityName}, {weather.country}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {weather.tempCurrent}°C
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Feels like {weather.feelsLike}°C
                </span>
              </div>
              <p className="text-xs font-medium text-cyan-200/90 mt-1">
                {weather.condition}
              </p>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
              {getWeatherIcon(weather.forecast[0].condition, "w-10 h-10")}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 relative z-10 text-[11px]">
            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-mono">Humidity</span>
                <span className="font-bold text-slate-200">{weather.humidity}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
              <Wind className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-mono">Wind</span>
                <span className="font-bold text-slate-200">{weather.windSpeed} km/h</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/5">
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-mono">Visibility</span>
                <span className="font-bold text-slate-200">{weather.visibility}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AQI & Air Quality Card (5 cols) */}
        <div className="md:col-span-5 bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Air Quality Index (AQI)
            </span>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${weather.aqi.color}`}>
              {weather.aqi.status}
            </span>
          </div>

          <div className="flex items-center justify-between my-1">
            <div>
              <span className="text-3xl font-black text-white font-mono">
                {weather.aqi.value}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                AQI US Scale
              </span>
            </div>

            {/* Pollutants readout */}
            <div className="flex flex-col gap-1 text-[10px] font-mono bg-black/40 p-2 rounded-lg border border-white/5">
              <div className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-500">PM2.5:</span>
                <span className="font-bold">{weather.aqi.pm25} µg/m³</span>
              </div>
              <div className="flex justify-between gap-3 text-slate-300">
                <span className="text-slate-500">PM10:</span>
                <span className="font-bold">{weather.aqi.pm10} µg/m³</span>
              </div>
            </div>
          </div>

          {/* AQI Indicator Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex border border-white/5">
            <div className="h-full bg-emerald-400" style={{ width: '20%' }} title="Good (0-50)" />
            <div className="h-full bg-amber-400" style={{ width: '20%' }} title="Moderate (51-100)" />
            <div className="h-full bg-orange-400" style={{ width: '20%' }} title="Unhealthy for Sensitive (101-150)" />
            <div className="h-full bg-rose-500" style={{ width: '20%' }} title="Unhealthy (151-200)" />
            <div className="h-full bg-purple-600" style={{ width: '20%' }} title="Very Unhealthy (201+)" />
          </div>
        </div>
      </div>

      {/* Sunrise & Sunset Times Banner */}
      <div className="bg-slate-900/40 border border-white/10 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
        
        {/* Sunrise */}
        <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-lg">
          <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
            <Sunrise className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block">Sunrise</span>
            <span className="text-xs font-bold text-amber-300 font-mono">{weather.sunTimes.sunrise}</span>
          </div>
        </div>

        {/* Sunset */}
        <div className="flex items-center gap-3 bg-indigo-500/5 border border-indigo-500/20 p-2.5 rounded-lg">
          <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
            <Sunset className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block">Sunset</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">{weather.sunTimes.sunset}</span>
          </div>
        </div>

        {/* Daylight Duration */}
        <div className="flex items-center gap-3 bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-lg">
          <div className="p-2 bg-cyan-500/15 rounded-lg text-cyan-400">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block">Daylight Duration</span>
            <span className="text-xs font-bold text-cyan-300 font-mono">{weather.sunTimes.dayLength}</span>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast Collapsible Dropdown Section */}
      <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
        
        {/* Dropdown Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-white/10 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              7-Day Forecast
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 7-DAY FORECAST DROPDOWN MENU */}
            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <select
                value={selectedDayIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setSelectedDayIndex(idx);
                  if (idx >= 0) {
                    setIsDropdownExpanded(true);
                  }
                  if (onAddLog && idx >= 0 && weather.forecast[idx]) {
                    const day = weather.forecast[idx];
                    onAddLog("info", `Selected ${day.day} (${day.date}) forecast: ${day.tempHigh}°C / ${day.tempLow}°C, ${day.condition}`);
                  }
                }}
                className="w-full bg-slate-950 border border-cyan-500/40 text-xs font-semibold text-cyan-300 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm hover:bg-slate-900 transition-colors"
              >
                <option value={-1} className="bg-slate-900 text-slate-400">
                  🔽 Select Day from 7-Day Forecast...
                </option>
                {weather.forecast.map((day, idx) => (
                  <option key={idx} value={idx} className="bg-slate-900 text-white">
                    {day.day} ({day.date}) — {day.tempHigh}° / {day.tempLow}° | {getConditionLabel(day.condition)} {day.pop > 0 ? `(${day.pop}% rain)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Expand/Collapse All 7 Days Button */}
            <button
              onClick={() => {
                const next = !isDropdownExpanded;
                setIsDropdownExpanded(next);
                if (next && selectedDayIndex === -1) {
                  setSelectedDayIndex(0); // default to today when expanding
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              {isDropdownExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hide Forecast</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Expand 7 Days</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Forecast Content - Shown only when dropdown is active or expanded */}
        {isDropdownExpanded && (
          <div className="flex flex-col gap-3 bg-slate-950/60 border border-cyan-500/20 rounded-xl p-3.5 animate-fadeIn">
            
            {/* Selected Day Detailed View Card */}
            {selectedDayForecast ? (
              <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-black/50 border border-white/10 rounded-xl shrink-0">
                    {getWeatherIcon(selectedDayForecast.condition, "w-8 h-8")}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {selectedDayForecast.day} <span className="text-xs font-normal text-slate-400">({selectedDayForecast.date})</span>
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-500/20">
                        {getConditionLabel(selectedDayForecast.condition)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 font-sans">
                      {getWeatherTip(selectedDayForecast)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-black/40 px-3 py-2 rounded-xl border border-white/10 shrink-0 self-end md:self-auto text-xs font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase">High / Low</span>
                    <span className="font-bold text-white">{selectedDayForecast.tempHigh}°C / <span className="text-slate-400">{selectedDayForecast.tempLow}°C</span></span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase">Rain Chance</span>
                    <span className="font-bold text-cyan-400">{selectedDayForecast.pop}%</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase">Humidity</span>
                    <span className="font-bold text-blue-300">{selectedDayForecast.humidity}%</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Compact 7-Day Quick Selection Strip inside Dropdown */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Select Day from Dropdown:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
                {weather.forecast.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDayIndex(idx);
                        if (onAddLog) {
                          onAddLog("info", `Selected ${day.day} forecast.`);
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)] font-bold" 
                          : "bg-slate-900/80 border-white/5 hover:border-white/20 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="text-[11px] font-bold">{day.day}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{day.tempHigh}°/{day.tempLow}°</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapse Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setIsDropdownExpanded(false);
                  setSelectedDayIndex(-1);
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 underline cursor-pointer"
              >
                ✕ Close Dropdown
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
