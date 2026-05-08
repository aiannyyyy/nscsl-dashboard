import React, { useState } from "react";
import {
  FlaskConical,
  RefreshCw,
  Search,
  FileText,
  Users,
  CalendarDays,
  ChevronDown,
  Archive,
  Inbox,
} from "lucide-react";

interface Patient {
  id: number;
  labNo: string;
  lName: string;
  fName: string;
  twin: number;
  code: string;
}

const MOCK_PATIENTS: Patient[] = [
  { id: 1, labNo: "20260020001", lName: "FLORES", fName: "MA ANGELYN", twin: 0, code: "1996" },
];

interface CMSResultReportProps {
  onPatientSelect?: (patient: Patient | null) => void;
  onGenerateReport?: (labNo: string) => void;
}

const StatPill = ({
  icon: Icon, label, value, iconBg, iconColor,
}: {
  icon: React.ElementType; label: string; value: string | number;
  iconBg: string; iconColor: string;
}) => (
  <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5">
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={13} className={iconColor} />
    </div>
    <div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-none">{value}</p>
    </div>
  </div>
);

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const CMSResultReport: React.FC<CMSResultReportProps> = ({
  onPatientSelect,
  onGenerateReport,
}) => {
  const today = new Date();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(MOCK_PATIENTS[0]);
  const [searchLabNo, setSearchLabNo] = useState("20260020001");
  const [archiveMode, setArchiveMode] = useState<"archive" | "master">("master");
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);

  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const dayNum = today.getDate();
  const year = today.getFullYear();
  const julianDate = Math.floor(
    (today.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleRowClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchLabNo(patient.labNo);
    onPatientSelect?.(patient);
  };

  const handleLoadPatients = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setPatients(MOCK_PATIENTS);
    setIsLoading(false);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <FlaskConical size={16} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              CMS Result Report
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">Connection:</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">PRODMSDS</span>
            </div>
          </div>
        </div>

        {/* Month picker */}
        <div className="relative">
          <button
            onClick={() => setShowMonthPicker(!showMonthPicker)}
            className="h-8 px-3 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
          >
            <CalendarDays size={12} className="text-gray-400" />
            {selectedMonth}
            <ChevronDown size={10} className="text-gray-400" />
          </button>
          {showMonthPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMonthPicker(false)} />
              <div className="absolute right-0 mt-1.5 w-36 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-20 overflow-hidden p-1">
                {months.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs rounded-lg transition-colors ${
                      selectedMonth === m
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-4 overflow-hidden">
        {/* Stat pills */}
        <div className="flex gap-2.5 flex-wrap">
          <StatPill icon={Users} label="Elevated Patients" value={patients.length}
            iconBg="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-500 dark:text-blue-400" />
          <StatPill icon={CalendarDays} label="Julian Date" value={julianDate}
            iconBg="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-500 dark:text-blue-400" />
          <StatPill icon={FileText} label="Date"
            value={`${dayName.slice(0, 3)}, ${monthName.slice(0, 3)} ${dayNum}`}
            iconBg="bg-emerald-50 dark:bg-emerald-900/30" iconColor="text-emerald-500 dark:text-emerald-400" />
        </div>

        {/* Patient table */}
        <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto min-h-0">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                {["#", "Lab No.", "Last Name", "First Name", "Twin", "Code"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400">No patients loaded</td>
                </tr>
              ) : (
                patients.map((p) => {
                  const sel = selectedPatient?.id === p.id;
                  return (
                    <tr key={p.id} onClick={() => handleRowClick(p)}
                      className={`cursor-pointer transition-colors ${sel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <span className={`text-[11px] font-medium ${sel ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>{p.id}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <span className={`font-mono text-[11px] ${sel ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>{p.labNo}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 font-medium text-gray-800 dark:text-gray-200">{p.lName}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">{p.fName}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 text-center text-gray-500">{p.twin}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">{p.code}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Load panel */}
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3.5">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
              <button
                onClick={() => setArchiveMode("archive")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${
                  archiveMode === "archive" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Archive size={11} /> Archive
              </button>
              <button
                onClick={() => setArchiveMode("master")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors ${
                  archiveMode === "master" ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Inbox size={11} /> Master
              </button>
            </div>
            <button
              onClick={handleLoadPatients}
              disabled={isLoading}
              className="w-full h-9 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
              Load Elevated Patients
            </button>
          </div>

          {/* Search panel */}
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3.5">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchLabNo}
                onChange={(e) => setSearchLabNo(e.target.value)}
                placeholder="Patient laboratory number"
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => onGenerateReport?.(searchLabNo)}
              className="w-full h-9 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={13} /> Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};