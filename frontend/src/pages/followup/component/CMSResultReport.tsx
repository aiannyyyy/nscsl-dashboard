import React, { useState } from "react";
import {
  FlaskConical,
  RefreshCw,
  FileText,
  Users,
  CalendarDays,
} from "lucide-react";
import { useGetPatientResultTable } from "../../../hooks/FollowupHooks/useCmsUrgent";
import PatientRecordModal, { type SampleRecord } from '../../laboratory/components/PatientRecordModal';

interface Patient {
  LABNO: string;
  LNAME: string;
  FNAME: string;
  DTRECV: string;
  SUBMID: string;
  TWIN: string;
  MNEMONICS: string;
}

interface CMSResultReportProps {
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient | null) => void;
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

const toDateInputValue = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

// Convert Patient to SampleRecord shape for PatientRecordModal
const toSampleRecord = (p: Patient): SampleRecord => ({
  LABNO:   p.LABNO,
  LABID:   "",
  LNAME:   p.LNAME,
  FNAME:   p.FNAME,
  SUBMID:  p.SUBMID,
  BIRTHDT: "",
  BIRTHTM: "",
  DTCOLL:  "",
  TMCOLL:  "",
  DTRECV:  p.DTRECV,
  TMRECV:  "",
  DTRPTD:  "",
  GESTAGE: "",
  AGECOLL: "",
  SEX:     "",
});

export const CMSResultReport: React.FC<CMSResultReportProps> = ({
  selectedPatient,
  onPatientSelect,
  onGenerateReport,
}) => {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today));
  const [fetchDate, setFetchDate] = useState(toDateInputValue(today));
  const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);

  const year = today.getFullYear();
  const julianDate = Math.floor(
    (today.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );

  const { data, isLoading, isError, error } = useGetPatientResultTable(fetchDate);
  const patients: Patient[] = data?.data ?? [];

  const handleRowClick = (patient: Patient) => {
    onPatientSelect(patient);
  };

  const handleLoadPatients = () => {
    setFetchDate(selectedDate);
  };

  const handleViewPIS = () => {
    if (!selectedPatient) return;
    onGenerateReport?.(selectedPatient.LABNO);
    setPisRecord(toSampleRecord(selectedPatient));
  };

  return (
    <>
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

          {/* Date picker */}
          <div className="relative flex items-center gap-2">
            <CalendarDays size={14} className="text-gray-400 pointer-events-none absolute left-3 z-10" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 p-5 gap-4 overflow-hidden">

          {/* Stat pills */}
          <div className="flex gap-2.5 flex-wrap">
            <StatPill
              icon={Users} label="Elevated Patients" value={isLoading ? "..." : patients.length}
              iconBg="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-500 dark:text-blue-400"
            />
            <StatPill
              icon={CalendarDays} label="Julian Date" value={julianDate}
              iconBg="bg-blue-50 dark:bg-blue-900/30" iconColor="text-blue-500 dark:text-blue-400"
            />
            <StatPill
              icon={FileText} label="Date" value={formatDisplayDate(fetchDate)}
              iconBg="bg-emerald-50 dark:bg-emerald-900/30" iconColor="text-emerald-500 dark:text-emerald-400"
            />
          </div>

          {/* Patient table */}
          <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto min-h-0">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  {["#", "Lab No.", "Last Name", "First Name", "Twin", "Mnemonic"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400">
                      <RefreshCw size={14} className="animate-spin inline mr-2" />
                      Loading patients...
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-red-400">
                      {(error as Error)?.message ?? "Failed to load patients."}
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && patients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-gray-400">
                      No patients found for {formatDisplayDate(fetchDate)}.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && patients.map((p, index) => {
                  const sel = selectedPatient?.LABNO === p.LABNO;
                  return (
                    <tr
                      key={p.LABNO}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(p);
                      }}
                      className={`cursor-pointer transition-colors ${sel ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
                    >
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <span className={`text-[11px] font-medium ${sel ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>{index + 1}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <span className={`font-mono text-[14px] ${sel ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>{p.LABNO}</span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 font-medium text-gray-800 dark:text-gray-200">{p.LNAME}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">{p.FNAME}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 text-center text-gray-500">{p.TWIN}</td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex flex-wrap gap-1">
                          {p.MNEMONICS.split(", ").map((m) => (
                            <span key={m} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom controls */}
          <div className="flex gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3.5">
            <button
              onClick={handleLoadPatients}
              disabled={isLoading}
              className="flex-1 h-9 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Users size={13} />}
              Load Elevated Patients
            </button>

            <button
              onClick={handleViewPIS}
              disabled={!selectedPatient || isLoading}
              className="flex-1 h-9 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={13} /> View PIS
            </button>
          </div>

        </div>
      </div>

      {/* Patient Record Modal */}
      {pisRecord && (
        <PatientRecordModal
          record={pisRecord}
          onClose={() => setPisRecord(null)}
        />
      )}
    </>
  );
};