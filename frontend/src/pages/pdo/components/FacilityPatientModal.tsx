import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getUnsatDetails, getFullPatient } from "../../../services/PDOServices/unsatApi";
import type { PatientDetails } from "../../../services/PDOServices/patientDetailsTypes";
import { NotebookDetailsModal } from "./NotebookDetailsModal";

type Mode = "numbers" | "percentage";

interface Props {
  open: boolean;
  onClose: () => void;
  facilityName: string | null;
  from: string;
  to: string;
  mode: Mode;
}

export interface UnsatDetail {
  LABNO: string;
  FIRST_NAME?: string;
  first_name?: string;
  LAST_NAME?: string;
  last_name?: string;
  TEST_RESULT?: string;
  test_result?: string;
}

export const FacilityPatientModal: React.FC<Props> = ({
  open,
  onClose,
  facilityName,
  from,
  to,
  mode,
}) => {
  const [data, setData] = useState<UnsatDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTestResult, setSelectedTestResult] = useState<string>("all");
  const [filteredData, setFilteredData] = useState<UnsatDetail[]>([]);
  const [availableTestResults, setAvailableTestResults] = useState<string[]>([]);

  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // ================= FETCH =================
  useEffect(() => {
    if (!open || !facilityName) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);

        if (mode === "numbers") {
          const res = await getUnsatDetails(from, to, facilityName);
          setData(res.rows || res);
        }

        if (mode === "percentage") {
          const res = await getFullPatient(from, to, facilityName);
          setData(res.rows || []);
        }
      } catch (err) {
        console.error("❌ Failed to load facility details", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, facilityName, from, to, mode]);

  // ================= UNIQUE TEST RESULTS =================
  useEffect(() => {
    const uniqueResults = Array.from(
      new Set(
        data.map(row => row.TEST_RESULT || row.test_result || "").filter(Boolean)
      )
    ).sort();
    setAvailableTestResults(uniqueResults);
  }, [data]);

  // ================= FILTER =================
  useEffect(() => {
    let filtered = [...data];

    if (selectedTestResult !== "all") {
      filtered = filtered.filter((row) => {
        const testResult = row.TEST_RESULT || row.test_result || "";
        return testResult === selectedTestResult;
      });
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => {
        const firstName = (row.FIRST_NAME || row.first_name || "").toLowerCase();
        const lastName = (row.LAST_NAME || row.last_name || "").toLowerCase();
        const labno = (row.LABNO || "").toLowerCase();
        const testResult = (row.TEST_RESULT || row.test_result || "").toLowerCase();

        return (
          labno.includes(search) ||
          firstName.includes(search) ||
          lastName.includes(search) ||
          `${firstName} ${lastName}`.includes(search) ||
          testResult.includes(search)
        );
      });
    }

    setFilteredData(filtered);
  }, [searchTerm, selectedTestResult, data]);

  const clearSearch = () => {
    setSearchTerm("");
    setSelectedTestResult("all");
  };

  // ================= EXPORT EXCEL =================
  const handleExport = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }

    const exportData = filteredData.map((row) => {
      const firstName = row.FIRST_NAME || row.first_name || "";
      const lastName = row.LAST_NAME || row.last_name || "";
      const testResult = row.TEST_RESULT || row.test_result || "";

      return {
        "Lab No": row.LABNO,
        "First Name": firstName,
        "Last Name": lastName,
        "Patient Name": `${firstName} ${lastName}`,
        "Test Result": testResult,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");

    const modeLabel = mode === "numbers" ? "Numbers" : "Percentage";
    const fileName = `${modeLabel}_${facilityName}_${from}_to_${to}.xlsx`;

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    saveAs(blob, fileName);
  };

  // ================= NOTEBOOK FETCH =================
  const openNotebook = async (row: UnsatDetail) => {
    try {
      setPatientLoading(true);
      setSelectedPatient(null);
      setShowNotebookModal(true);

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/notebooks/complete-details?labno=${row.LABNO}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const data = await response.json();

      const patientDetails: PatientDetails = {
        labno: data.LABNO || row.LABNO,
        labid: data.LABID || '',
        fname: data.FNAME || row.FIRST_NAME || row.first_name || '',
        lname: data.LNAME || row.LAST_NAME || row.last_name || '',
        sex: data.SEX || '',
        birthdt: data.BIRTHDT,
        birthtm: data.BIRTHTM,
        birthwt: data.BIRTHWT || '',
        birthhosp: data.BIRTHHOSP,
        dtcoll: data.DTCOLL,
        tmcoll: data.TMCOLL,
        dtrecv: data.DTRECV,
        dtrptd: data.DTRPTD,
        releasedt: data.RELEASEDT,
        spectype: data.SPECTYPE,
        milktype: data.MILKTYPE,
        gestage: data.GESTAGE,
        agecoll: data.AGECOLL,
        transfus: data.TRANSFUS,
        transfusdt: data.TRANSFUSDT,
        birthorder: data.BIRTHORDER,
        clinstat: data.CLINSTAT,
        physid: data.PHYSID,
        submid: data.SUBMID || '',
        provider_descr1: data.PROVIDER_DESCR1,
        notes: data.NOTES,
        disorderResults: Array.isArray(data.disorderResults) ? data.disorderResults : []
      };

      setSelectedPatient(patientDetails);
    } catch (error) {
      alert("Failed to load patient");
      setShowNotebookModal(false);
    } finally {
      setPatientLoading(false);
    }
  };

  const handleBackToFacilityList = () => {
    setShowNotebookModal(false);
    setSelectedPatient(null);
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedTestResult("all");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-6xl rounded-xl bg-white dark:bg-gray-900 shadow-lg">

          {/* HEADER */}
          <div className="flex justify-between items-center px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h5 className="font-semibold text-gray-800 dark:text-gray-100">
                Facility Details — {facilityName}
              </h5>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Total: {data.length} patients
                {(searchTerm || selectedTestResult !== "all") && ` • Showing: ${filteredData.length} filtered results`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>

          {/* FILTER SECTION */}
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by Lab No, Name, or Test Result..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Test Result Dropdown */}
              <div className="w-56">
                <select
                  value={selectedTestResult}
                  onChange={(e) => setSelectedTestResult(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Test Results</option>
                  {availableTestResults.map((result) => (
                    <option key={result} value={result}>
                      {result}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear All Filters Button */}
              {(searchTerm || selectedTestResult !== "all") && (
                <button
                  onClick={clearSearch}
                  className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* BODY */}
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading details...</p>
              </div>
            )}

            {!loading && data.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">No unsatisfactory samples found</p>
              </div>
            )}

            {!loading && data.length > 0 && filteredData.length === 0 && (
              <div className="text-center py-8">
                <Search size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No patients match your search</p>
                <button
                  onClick={clearSearch}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {!loading && filteredData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-300 dark:border-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left text-gray-700 dark:text-gray-300 font-semibold">
                        Lab No
                      </th>
                      <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left text-gray-700 dark:text-gray-300 font-semibold">
                        Patient Name
                      </th>
                      <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-left text-gray-700 dark:text-gray-300 font-semibold">
                        Test Result
                      </th>
                      <th className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-center text-gray-700 dark:text-gray-300 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, i) => {
                      const firstName = row.FIRST_NAME || row.first_name || "";
                      const lastName = row.LAST_NAME || row.last_name || "";
                      const testResult = row.TEST_RESULT || row.test_result || "—";

                      return (
                        <tr
                          key={i}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            {row.LABNO}
                          </td>

                          <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                            {firstName} {lastName}
                          </td>

                          <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 font-semibold">
                            {testResult}
                          </td>

                          <td className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-center">
                            <button
                              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              onClick={() => openNotebook(row)}
                            >
                              View Notebook
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center px-5 py-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="px-3 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              Export Excel
            </button>

            <button
              onClick={handleClose}
              className="px-4 py-1.5 text-sm rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ================= NOTEBOOK DETAILS MODAL ================= */}
      <NotebookDetailsModal
        isOpen={showNotebookModal}
        onClose={handleBackToFacilityList}
        onBackToResults={handleBackToFacilityList}
        onBackToSearch={handleBackToFacilityList}
        patient={selectedPatient}
        loading={patientLoading}
        onNotebookAdded={() => {
          console.log("🔄 Notebook added from Unsatisfactory view");
        }}
      />
    </>
  );
};