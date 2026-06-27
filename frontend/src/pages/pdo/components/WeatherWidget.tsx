import React, { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { isMockMode } from "../../../mocks/config";
import { getMockWeather } from "../../../mocks/data/mockFixtures";

const apiKey = "a750bc4606f0dc6c29f1041e4cd1080c";

const provinces = [
  { name: "Batangas", lat: 13.7565, lon: 121.0583 },
  { name: "Cavite", lat: 14.4791, lon: 120.897 },
  { name: "Rizal", lat: 14.6037, lon: 121.3084 },
  { name: "Quezon", lat: 13.9414, lon: 121.6234 },
  { name: "Laguna", lat: 14.2691, lon: 121.4113 },
];

const emojiMap: Record<string, string> = {
  Clear: "☀️",
  Clouds: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Thunderstorm: "⛈️",
  Mist: "🌫️",
  Haze: "🌫️",
  Fog: "🌫️",
};

type WeatherCurrent = {
  temp: number;
  desc: string;
  icon: string;
};

type WeatherDay = {
  day: string;
  temp: number;
  icon: string;
};

export const WeatherBar: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<WeatherCurrent | null>(null);
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);

  const province = provinces[index];

  const getEmoji = (cond: string) => emojiMap[cond] || "🌤️";

  const applyMockWeather = () => {
    const mock = getMockWeather(province.name);
    setCurrent({ temp: mock.temp, desc: mock.desc, icon: mock.icon });
    setForecast(mock.forecast);
  };

  const fetchWeather = async () => {
    if (isMockMode()) {
      applyMockWeather();
      return;
    }

    try {
      setLoading(true);

      const cRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${province.lat}&lon=${province.lon}&appid=${apiKey}&units=metric`
      );
      const cData = await cRes.json();

      const fRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${province.lat}&lon=${province.lon}&appid=${apiKey}&units=metric`
      );
      const fData = await fRes.json();

      if (!cRes.ok || !cData?.main?.temp || !cData?.weather?.[0]) {
        console.warn("[Weather] Current weather unavailable:", cData?.message ?? cRes.status);
        setCurrent(null);
        setForecast([]);
        return;
      }

      setCurrent({
        temp: Math.round(cData.main.temp),
        desc: cData.weather[0].description,
        icon: getEmoji(cData.weather[0].main),
      });

      if (!fRes.ok || !Array.isArray(fData?.list)) {
        setForecast([]);
        return;
      }

      const daily = fData.list.slice(0, 5).map((item: { dt: number; main: { temp: number }; weather: { main: string }[] }) => ({
        day: new Date(item.dt * 1000).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        temp: Math.round(item.main.temp),
        icon: getEmoji(item.weather[0].main),
      }));

      setForecast(daily);
    } catch (e) {
      console.error(e);
      setCurrent(null);
      setForecast([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [index]);

  return (
    <div className="w-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-2xl px-6 py-3 text-white shadow-md flex items-center justify-between">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-4">
        <div className="text-3xl font-bold">{current ? `${current.temp}°C` : "--"}</div>
        <div className="text-3xl">{current?.icon}</div>
        <div>
          <div className="font-semibold text-sm">{province.name}</div>
          <div className="text-xs text-slate-200">
            {loading ? "Loading..." : current?.desc ?? "Weather unavailable"}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4">

        {/* Forecast Pills */}
        <div className="flex gap-2">
          {forecast.map((d, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-center w-16"
            >
              <div className="text-[11px]">{d.day}</div>
              <div className="text-lg leading-none">{d.icon}</div>
              <div className="text-xs font-semibold">{d.temp}°</div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 ml-2">
          <button onClick={() => setIndex(i => (i === 0 ? provinces.length - 1 : i - 1))}>
            <ChevronLeft size={18} />
          </button>

          <button onClick={() => setIndex(i => (i === provinces.length - 1 ? 0 : i + 1))}>
            <ChevronRight size={18} />
          </button>

          <button onClick={fetchWeather}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeatherBar;
