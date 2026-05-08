import React, { useState } from "react";
import { ClipboardList, Printer, AlertTriangle, User, Building2 } from "lucide-react";

interface DisorderRow {
  disorderGroup: string;
  disorder: string;
  description: "Normal" | "Elevated" | "Low";
  release: string;
  print: string;
}

const DISORDER_DATA: DisorderRow[] = [
  { disorderGroup: "Amino Acid Disorders (AA)", disorder: "HCYS", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "MSUDMS", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "PKUMS", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "TYR1", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "TYRII/III/TRANS", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Biotinidase Deficiency (BTND)", disorder: "Biotinidase", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Congenital Adrenal Hyperplasia (CAH)", disorder: "CAH", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Congenital Hypothyroidism (CH)", disorder: "CH", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Cystic Fibrosis (CF)", disorder: "Cystic Fibrosis", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Fatty Acid Disorders (FAO)", disorder: "CPT1", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "CPT2", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "CUD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "GA-II", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "LCHAD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "MCAD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "VLCAD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Galactosemia (GAL)", disorder: "GAL_GSP", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Glucose-6-Phosphate Dehydrogenase Deficiency", disorder: "G6PD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Hemoglobinopathies (HGB)", disorder: "HGB HPLC", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Organic Acid Disorders (OA)", disorder: "BKT/BKD/3MCC", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "GA-I", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "IVA", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "MCD", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "", disorder: "PA/MMA", description: "Normal", release: "Sup", print: "No" },
  { disorderGroup: "Urea Cycle Disorders (UC)", disorder: "CIT", description: "Normal", release: "Sup", print: "No" },
];

const descriptionBadge = (desc: string) => {
  if (desc === "Elevated")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] font-semibold text-red-600 dark:text-red-400">
        {desc}
      </span>
    );
  if (desc === "Low")
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
        {desc}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
      {desc}
    </span>
  );
};

interface PatientDisorderViewerProps {
  patientLabNo?: string;
  patientName?: string;
  onPrintPreview?: (options: { copy: "patient" | "facility"; urgent: boolean }) => void;
}

export const PatientDisorderViewer: React.FC<PatientDisorderViewerProps> = ({
  patientLabNo = "20260020001",
  patientName = "FLORES, MA ANGELYN",
  onPrintPreview,
}) => {
  const [printCopy, setPrintCopy] = useState<"patient" | "facility">("facility");
  const [urgent, setUrgent] = useState(true);

  const normalCount = DISORDER_DATA.filter((d) => d.description === "Normal").length;
  const elevatedCount = DISORDER_DATA.filter((d) => d.description === "Elevated").length;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <ClipboardList size={16} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              Patient Disorder Viewer
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Newborn screening results</p>
          </div>
        </div>

        {/* Urgent badge */}
        {urgent && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-[11px] font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle size={11} />
            URGENT
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-4 overflow-hidden">

        {/* Patient info card */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{patientName}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{patientLabNo}</p>
          </div>
          <div className="ml-auto flex gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {normalCount} Normal
            </span>
            {elevatedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] font-semibold text-red-600 dark:text-red-400">
                {elevatedCount} Elevated
              </span>
            )}
          </div>
        </div>

        {/* Disorder table */}
        <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-auto min-h-0">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-500 sticky top-0">
                {["Disorder Group", "Disorder", "Description", "Release", "Print"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[10px] font-semibold text-white uppercase tracking-widest border border-blue-400 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DISORDER_DATA.map((row, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10 ${
                    idx % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50 dark:bg-gray-800/60"
                  }`}
                >
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {row.disorderGroup ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium text-[11px]">
                        {row.disorderGroup}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      {row.disorder}
                    </span>
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                    {descriptionBadge(row.description)}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center text-[11px] text-gray-500 dark:text-gray-400">
                    {row.release}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center text-[11px] text-gray-500 dark:text-gray-400">
                    {row.print}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Print copy toggle */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">Print copy</p>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
              <button
                onClick={() => setPrintCopy("patient")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  printCopy === "patient"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <User size={10} /> Patient
              </button>
              <button
                onClick={() => setPrintCopy("facility")}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  printCopy === "facility"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Building2 size={10} /> Facility
              </button>
            </div>
          </div>

          {/* Urgent toggle */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">Label</p>
            <button
              onClick={() => setUrgent(!urgent)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                urgent
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
              }`}
            >
              <AlertTriangle size={11} />
              {urgent ? "Urgent on" : "No urgent label"}
            </button>
          </div>

          {/* Print preview */}
          <button
            onClick={() => onPrintPreview?.({ copy: printCopy, urgent })}
            className="ml-auto h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Printer size={13} />
            Print Preview
          </button>
        </div>
      </div>
    </div>
  );
};