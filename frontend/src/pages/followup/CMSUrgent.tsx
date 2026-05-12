import React, { useState, useRef } from "react";
import { CMSResultReport } from "./component/CMSResultReport";
import { PatientDisorderViewer } from "./component/PatientDisorderViewer";
import { PDFViewer } from "./component/PDFViewer";

interface Patient {
  LABNO: string;
  LNAME: string;
  FNAME: string;
  DTRECV: string;
  SUBMID: string;
  TWIN: string;
  MNEMONICS: string;
}

export const CMSUrgent = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [reportUrl, setReportUrl]             = useState<string | null>(null);
  const [source, setSource]                   = useState<"master" | "archive" | null>(null);
  const [isGenerating, setIsGenerating]       = useState(false);

  const [disorderLabNo, setDisorderLabNo]             = useState("");
  const [disorderPatientName, setDisorderPatientName] = useState("");

  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    setReportUrl(null);
    setSource(null);
    if (patient) {
      setDisorderLabNo(patient.LABNO);
      setDisorderPatientName(`${patient.LNAME}, ${patient.FNAME}`);
    } else {
      setDisorderLabNo("");
      setDisorderPatientName("");
    }
  };

  const handleGenerateReport = (labNo: string) => {
    setDisorderLabNo(labNo);
    if (selectedPatient?.LABNO === labNo) {
      setDisorderPatientName(`${selectedPatient.LNAME}, ${selectedPatient.FNAME}`);
    } else {
      setDisorderPatientName(labNo);
    }
  };

  const handleReportGenerated = (url: string | null, reportSource: "master" | "archive" | null) => {
    setReportUrl(url);
    setSource(reportSource);
    setIsGenerating(false);
    setTimeout(() => {
      pdfRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleGenerating = () => {
    setIsGenerating(true);
    setReportUrl(null);
    setSource(null);
  };

  return (
    <div className="flex flex-col w-full bg-gray-100 dark:bg-gray-950 p-4 gap-4" style={{ minHeight: '100vh' }}>

      {/* Top row */}
      <div className="flex gap-4" style={{ height: '750px', flexShrink: 0 }}>
        <div className="w-1/2 h-full">
          <CMSResultReport
            selectedPatient={selectedPatient}
            onPatientSelect={handlePatientSelect}
            onGenerateReport={handleGenerateReport}
          />
        </div>
        <div className="w-1/2 h-full">
          <PatientDisorderViewer
            patientLabNo={disorderLabNo}
            patientName={disorderPatientName}
            onReportGenerated={handleReportGenerated}
            onGenerating={handleGenerating}
          />
        </div>
      </div>

      {/* Bottom row — PDF viewer */}
      <div ref={pdfRef} style={{ height: '1000px', flexShrink: 0 }}>
        <PDFViewer
          reportUrl={reportUrl}
          source={source}
          isLoading={isGenerating}
        />
      </div>

    </div>
  );
};