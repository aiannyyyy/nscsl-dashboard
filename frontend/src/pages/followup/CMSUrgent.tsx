import React, { useState } from "react";
import { CMSResultReport } from "./component/CMSResultReport";
import { PatientDisorderViewer } from "./component/PatientDisorderViewer";
import { PDFViewer } from "./component/PDFViewer";

interface Patient {
  id: number;
  labNo: string;
  lName: string;
  fName: string;
  twin: number;
  code: string;
}

export const CMSUrgent = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setPdfUrl(undefined);
  };

  const handleGenerateReport = (labNo: string) => {
    // TODO: replace with actual API call
    // setPdfUrl(`/api/reports/${labNo}.pdf`);
    console.log("Generating report for:", labNo);
  };

  const handlePrintPreview = (options: { copy: "patient" | "facility"; urgent: boolean }) => {
    console.log("Print preview:", options);
  };

  const patientDisplayName = selectedPatient
    ? `${selectedPatient.lName}, ${selectedPatient.fName}`
    : undefined;

  return (
    <div className="flex flex-col w-full bg-gray-100 dark:bg-gray-950 p-4 gap-4" style={{ minHeight: '100vh' }}>

      {/* Top row — fixed height, never shrinks */}
      <div
        className="flex gap-4"
        style={{ height: '750px', flexShrink: 0 }}
      >
        <div className="w-1/2 h-full">
          <CMSResultReport
            onPatientSelect={handlePatientSelect}
            onGenerateReport={handleGenerateReport}
          />
        </div>
        <div className="w-1/2 h-full">
          <PatientDisorderViewer
            patientLabNo={selectedPatient?.labNo}
            patientName={patientDisplayName}
            onPrintPreview={handlePrintPreview}
          />
        </div>
      </div>

      {/* Bottom row — PDF viewer, fixed height, never shrinks */}
      <div style={{ height: '700px', flexShrink: 0 }}>
        <PDFViewer
          pdfUrl={pdfUrl}
          title={selectedPatient ? `Report Preview — ${selectedPatient.labNo}` : "Report Preview"}
        />
      </div>

    </div>
  );
};