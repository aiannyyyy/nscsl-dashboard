import React, { useState, useRef } from 'react';
import { G6PDIndividualTable } from './components/G6PDIndividualTable';
import { G6PDSummaryTable }    from './components/G6PDSummaryTable';
import { G6PDReportModal }     from './components/G6PDReportModal';
import PatientRecordModal      from './components/PatientRecordModal';
import { getG6PDReportPath } from '../../services/FollowupServices/autoMailerServices';
import type { G6PDRecord }     from './components/G6PDIndividualTable';
import type { SampleRecord }   from './components/PatientRecordModal';

const toSampleRecord = (g: G6PDRecord): SampleRecord => ({
    LABNO:   g.LABNO   ?? '',
    LABID:   '',
    LNAME:   g.LNAME   ?? '',
    FNAME:   g.FNAME   ?? '',
    SUBMID:  g.SUBMID  ?? '',
    BIRTHDT: g.BIRTHDT ?? '',
    BIRTHTM: '',
    DTCOLL:  g.DTCOLL  ?? '',
    TMCOLL:  '',
    DTRECV:  '',
    TMRECV:  '',
    DTRPTD:  g.DTRPTD  ?? '',
    GESTAGE: '',
    AGECOLL: '',
    SEX:     g.SEX     ?? '',
});

export const AutoMailerReport = () => {
    const [selectedRecord, setSelectedRecord] = useState<G6PDRecord | null>(null);
    const [reportUrl,      setReportUrl]      = useState<string | null>(null);
    const [isGenerating,   setIsGenerating]   = useState(false);
    const [reportTitle,    setReportTitle]    = useState<string | undefined>(undefined);

    // ── PIS modal state ─────────────────────────────────────────────────
    const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);

    const pdfRef = useRef<HTMLDivElement>(null);

    const scrollToPdf = () => {
        setTimeout(() => {
            pdfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // ── Individual row "View Report" ─────────────────────────────────────
    const handleViewReport = (record: G6PDRecord, fileName: string | null) => {
        setSelectedRecord(record);
        setReportTitle(undefined);
        setReportUrl(fileName ? getG6PDReportPath(fileName) : null);
        setIsGenerating(false);
        scrollToPdf();
    };

    const handleRowGenerating = (record: G6PDRecord) => {
        setSelectedRecord(record);
        setReportTitle(undefined);
        setReportUrl(null);
        setIsGenerating(true);
        scrollToPdf();
    };

    // ── Summary "Generate All" ───────────────────────────────────────────
    const handleSummaryGenerating = (dateFrom: string, dateTo: string) => {
        setSelectedRecord(null);
        setReportTitle(`Summary Report — ${dateFrom} → ${dateTo}`);
        setReportUrl(null);
        setIsGenerating(true);
        scrollToPdf();
    };

    const handleSummaryReport = (fileName: string | null) => {
        setReportUrl(fileName ? getG6PDReportPath(fileName) : null);
        setIsGenerating(false);
        scrollToPdf();
    };

    // ── PIS modal ────────────────────────────────────────────────────────
    const handleViewPIS = (record: G6PDRecord) => {
        setPisRecord(toSampleRecord(record));
    };

    const handleClosePIS = () => {
        setPisRecord(null);
    };

    const handleSendEmail = (record: G6PDRecord) => {
        console.log('[AutoMailer] Send email for:', record.LABNO);
    };

    // ── Modal internal retry/regenerate ─────────────────────────────────
    const handleReportGenerated = (url: string | null) => {
        setReportUrl(url);
        setIsGenerating(false);
        scrollToPdf();
    };

    const handleGenerating = () => {
        setIsGenerating(true);
        setReportUrl(null);
    };

    const handleCloseModal = () => {
        setSelectedRecord(null);
        setReportTitle(undefined);
        setReportUrl(null);
        setIsGenerating(false);
    };

    return (
        <div
            className="flex flex-col w-full bg-gray-100 dark:bg-gray-950 p-4 gap-4"
            style={{ minHeight: '100vh' }}
        >
            {/* PIS modal */}
            {pisRecord && (
                <PatientRecordModal
                    record={pisRecord}
                    onClose={handleClosePIS}
                />
            )}

            {/* Top row — Individual (left) + Summary (right) */}
            <div className="flex gap-4" style={{ height: '560px', flexShrink: 0 }}>
                <div className="w-1/2 h-full">
                    <G6PDIndividualTable
                        onViewReport={handleViewReport}
                        onGenerating={handleRowGenerating}
                        onViewPIS={handleViewPIS}
                        onSendEmail={handleSendEmail}
                    />
                </div>
                <div className="w-1/2 h-full">
                    <G6PDSummaryTable
                        onViewReport={handleViewReport}
                        onGenerating={handleRowGenerating}
                        onViewPIS={handleViewPIS}
                        onSendEmail={handleSendEmail}
                        onSummaryGenerating={handleSummaryGenerating}
                        onSummaryReport={handleSummaryReport}
                    />
                </div>
            </div>

            {/* Bottom row — PDF viewer */}
            <div ref={pdfRef} style={{ height: '1000px', flexShrink: 0 }}>
                <G6PDReportModal
                    record={selectedRecord}
                    reportUrl={reportUrl}
                    isGenerating={isGenerating}
                    reportTitle={reportTitle}
                    onReportGenerated={handleReportGenerated}
                    onGenerating={handleGenerating}
                    onClose={handleCloseModal}
                    inline
                />
            </div>
        </div>
    );
};