import React, { useState, useRef } from 'react';
import { G6PDIndividualTable } from './components/G6PDIndividualTable';
import { G6PDSummaryTable }    from './components/G6PDSummaryTable';
import { G6PDReportModal }     from './components/G6PDReportModal';
import PatientRecordModal      from './components/PatientRecordModal';
import type { G6PDRecord }     from './components/G6PDIndividualTable';
import type { SampleRecord }   from './components/PatientRecordModal';

// Maps a G6PDRecord into the SampleRecord shape PatientRecordModal expects.
// PatientRecordModal fetches live detail by LABNO on open, so fields G6PDRecord
// doesn't have are safely left blank — they get overwritten immediately.
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

    // ── PIS modal state ─────────────────────────────────────────────────
    const [pisRecord, setPisRecord] = useState<SampleRecord | null>(null);

    const pdfRef = useRef<HTMLDivElement>(null);

    const handleViewReport = (record: G6PDRecord) => {
        setSelectedRecord(record);
        setReportUrl(null);
        setIsGenerating(false);
        // Scroll PDF viewer into view after a tick
        setTimeout(() => {
            pdfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleViewPIS = (record: G6PDRecord) => {
        setPisRecord(toSampleRecord(record));
    };

    const handleClosePIS = () => {
        setPisRecord(null);
    };

    const handleSendEmail = (record: G6PDRecord) => {
        // Wire up to email service later
        console.log('[AutoMailer] Send email for:', record.LABNO);
    };

    const handleReportGenerated = (url: string | null) => {
        setReportUrl(url);
        setIsGenerating(false);
        setTimeout(() => {
            pdfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleGenerating = () => {
        setIsGenerating(true);
        setReportUrl(null);
    };

    const handleCloseModal = () => {
        setSelectedRecord(null);
        setReportUrl(null);
        setIsGenerating(false);
    };

    return (
        <div
            className="flex flex-col w-full bg-gray-100 dark:bg-gray-950 p-4 gap-4"
            style={{ minHeight: '100vh' }}
        >
            {/* PIS modal — opens on top of everything when View PIS is clicked */}
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
                        onViewPIS={handleViewPIS}
                        onSendEmail={handleSendEmail}
                    />
                </div>
                <div className="w-1/2 h-full">
                    <G6PDSummaryTable
                        onViewReport={handleViewReport}
                        onViewPIS={handleViewPIS}
                        onSendEmail={handleSendEmail}
                    />
                </div>
            </div>

            {/* Bottom row — PDF / Report viewer */}
            <div ref={pdfRef} style={{ height: '1000px', flexShrink: 0 }}>
                <G6PDReportModal
                    record={selectedRecord}
                    reportUrl={reportUrl}
                    isGenerating={isGenerating}
                    onReportGenerated={handleReportGenerated}
                    onGenerating={handleGenerating}
                    onClose={handleCloseModal}
                    inline
                />
            </div>
        </div>
    );
};