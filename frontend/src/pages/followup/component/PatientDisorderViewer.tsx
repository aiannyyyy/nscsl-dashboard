import React, { useState } from "react";
import { ClipboardList, Printer, AlertTriangle, User, Building2, RefreshCw } from "lucide-react";
import { useGetPatientDisorderResultTable } from "../../../hooks/FollowupHooks/useCmsUrgent";
import type { PatientDisorderResultTable, DisorderEntry } from "../../../services/FollowupServices/cmsUrgentServices";

const descriptionBadge = (desc: string, isAbnormal: boolean) => {
    if (isAbnormal)
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] font-semibold text-red-600 dark:text-red-400">
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

const INCLUDED = ["Normal", "Preterm", "Monitoring Sample"];

export const PatientDisorderViewer: React.FC<PatientDisorderViewerProps> = ({
    patientLabNo = "",
    patientName = "",
    onPrintPreview,
}) => {
    const [printCopy, setPrintCopy] = useState<"patient" | "facility">("facility");
    const [urgent, setUrgent] = useState(true);
    const [printOverrides, setPrintOverrides] = useState<Record<string, boolean>>({});

    const { data, isLoading, isError, error } = useGetPatientDisorderResultTable(patientLabNo);
    const rows: PatientDisorderResultTable[] = data?.data ?? [];

    const totalNormal = rows.reduce(
        (acc, g) => acc + g.disorders.filter((d) => INCLUDED.includes(d.DESCR1)).length,
        0
    );
    const totalElevated = rows.reduce((acc, g) => acc + g.disorders.filter(d => d.DESCR1 === "Elevated").length, 0);

    React.useEffect(() => {
        setPrintOverrides({});
    }, [patientLabNo]);

    const togglePrint = (key: string, rflag: string, descr1: string) => {
        const defaultPrint = !INCLUDED.includes(descr1);
        setPrintOverrides((prev) => {
            const current = prev[key] ?? defaultPrint;
            return { ...prev, [key]: !current };
        });
    };

    const getPrintValue = (key: string, rflag: string, descr1: string): boolean => {
        const defaultPrint = !INCLUDED.includes(descr1);
        return printOverrides[key] ?? defaultPrint;
    };

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
                        {patientLabNo ? (
                            <>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{patientName}</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{patientLabNo}</p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No patient selected</p>
                        )}
                    </div>
                    {patientLabNo && (
                        <div className="ml-auto flex gap-2 flex-shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {isLoading ? "..." : totalNormal} Normal
                            </span>
                            {totalElevated > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                    {totalElevated} Elevated
                                </span>
                            )}
                        </div>
                    )}
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
                            {!patientLabNo && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">
                                        Select a patient from the results table to view disorders.
                                    </td>
                                </tr>
                            )}
                            {patientLabNo && isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">
                                        <RefreshCw size={14} className="animate-spin inline mr-2" />
                                        Loading disorders...
                                    </td>
                                </tr>
                            )}
                            {patientLabNo && isError && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-red-400">
                                        {(error as Error)?.message ?? "Failed to load disorder results."}
                                    </td>
                                </tr>
                            )}
                            {patientLabNo && !isLoading && !isError && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">
                                        No disorder results found for {patientLabNo}.
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !isError && rows.map((group) =>
                                group.disorders.map((disorder: DisorderEntry, dIdx: number) => {
                                    const key = `${group.MAILERNAME}-${dIdx}`;
                                    const printOn = getPrintValue(key, disorder.RFLAG, disorder.DESCR1);
                                    const isAbnormal = !INCLUDED.includes(disorder.DESCR1);
                                    return (
                                        <tr
                                            key={key}
                                            className={`transition-colors ${
                                                dIdx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800/60"
                                            } hover:bg-blue-50 dark:hover:bg-blue-900/10`}
                                        >
                                            {/* Disorder Group — only on first row of group */}
                                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                                                {dIdx === 0 ? (
                                                    <span className={`font-medium text-[11px] ${
                                                        isAbnormal
                                                            ? "text-red-600 dark:text-red-400"
                                                            : "text-blue-600 dark:text-blue-400"
                                                    }`}>
                                                        {group.MAILERNAME}
                                                    </span>
                                                ) : null}
                                            </td>

                                            {/* Disorder Name */}
                                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                                                <span className={`font-mono text-[11px] font-semibold ${
                                                    isAbnormal
                                                        ? "text-red-600 dark:text-red-400"
                                                        : "text-gray-700 dark:text-gray-300"
                                                }`}>
                                                    {disorder.NAME}
                                                </span>
                                            </td>

                                            {/* Description badge — now red when abnormal */}
                                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                                                {descriptionBadge(disorder.DESCR1, isAbnormal)}
                                            </td>

                                            {/* Release */}
                                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                <span className={`text-[11px] font-semibold ${
                                                    isAbnormal
                                                        ? "text-red-600 dark:text-red-400"
                                                        : "text-gray-700 dark:text-gray-300"
                                                }`}>
                                                    {disorder.RFLAG === "S" ? "Yes" : "No"}
                                                </span>
                                            </td>

                                            {/* Print toggle */}
                                            <td className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-center">
                                                <button
                                                    onClick={() => togglePrint(key, disorder.RFLAG, disorder.DESCR1)}
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                                                        printOn
                                                            ? isAbnormal
                                                                ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                                                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                    }`}
                                                >
                                                    {printOn ? "Yes" : "No"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer controls */}
                <div className="flex items-center gap-3 flex-wrap">
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

                    <button
                        onClick={() => onPrintPreview?.({ copy: printCopy, urgent })}
                        disabled={!patientLabNo || isLoading}
                        className="ml-auto h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center gap-2"
                    >
                        <Printer size={13} />
                        Print Preview
                    </button>
                </div>
            </div>
        </div>
    );
};