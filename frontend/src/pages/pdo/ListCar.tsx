// src/pages/PDO/ListCar.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { CorrectiveActionReportChart } from "./components/CorrectiveActionReportChart";
import { CarPerProvinceChart } from "./components/CarPerProvinceChart";
import { CarListTable } from "./components/CarListTable";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getCurrentMonth = () => {
  const now = new Date();
  return months[now.getMonth()];
};

export default function ListCar() {
  // ── Shared filters ────────────────────────────────────────────────────────
  const [month,            setMonth]            = useState(getCurrentMonth());
  const [year,             setYear]             = useState(new Date().getFullYear().toString());
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedStatus,   setSelectedStatus]   = useState<string>("");
  const [provinces,        setProvinces]        = useState<string[]>([]);

  // Province dropdown
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const provinceRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

  // Close province dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) {
        setIsProvinceOpen(false);
      }
    };
    if (isProvinceOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProvinceOpen]);

  // Stabilized callback — no refreshTrigger needed; React Query handles refetch
  const handleProvincesLoaded = useCallback((loadedProvinces: string[]) => {
    setProvinces(loadedProvinces);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Page Header + Global Filters ─────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Corrective Action Report Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track and manage corrective action reports across facilities
            </p>
          </div>

          {/* Global filter bar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">

            {/* Month */}
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Year */}
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Province custom dropdown */}
            <div className="relative" ref={provinceRef}>
              <button
                onClick={() => setIsProvinceOpen(!isProvinceOpen)}
                className="h-9 px-4 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                           hover:bg-gray-50 dark:hover:bg-gray-700
                           flex items-center gap-2 min-w-[160px] justify-between"
              >
                <span className="truncate">
                  {selectedProvince === "all" ? "All Provinces" : selectedProvince}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isProvinceOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isProvinceOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800
                                border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg
                                z-50 max-h-64 overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => { setSelectedProvince("all"); setIsProvinceOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedProvince === "all"
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      All Provinces
                      {selectedProvince === "all" && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                      )}
                    </button>

                    {provinces.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        {provinces.map((province) => (
                          <button
                            key={province}
                            onClick={() => { setSelectedProvince(province); setIsProvinceOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              selectedProvince === province
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {province}
                            {selectedProvince === province && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="pending">Pending</option>
            </select>

          </div>
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CarPerProvinceChart
            month={month}
            year={year}
            status={selectedStatus}
            province={selectedProvince}
          />
          <CorrectiveActionReportChart
            month={month}
            year={year}
            province={selectedProvince}
            status={selectedStatus}
          />
        </div>

        {/* ── Table Row ─────────────────────────────────────────────────── */}
        <CarListTable
          onProvincesLoaded={handleProvincesLoaded}
          selectedProvince={selectedProvince}
          selectedStatus={selectedStatus}
          month={month}
          year={year}
        />

      </div>
    </div>
  );
}