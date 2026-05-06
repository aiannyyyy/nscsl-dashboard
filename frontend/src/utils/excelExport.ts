import * as XLSX from 'xlsx';

/**
 * Export unsatisfactory rate data to Excel
 */
export const exportUnsatRateToExcel = (
  data: any[],
  from: string,
  to: string,
  province: string
) => {
  const formattedData = data.map((item, index) => ({
    'Rank': index + 1,
    'Facility Name': item.FACILITY_NAME || item.facility_name || 'Unknown',
    'Province': item.PROVINCE || item.province || '—',
    'Unsatisfactory Rate (%)': (item.UNSAT_RATE ?? item.unsat_rate ?? 0).toFixed(2),
    'Unsatisfactory Count': item.UNSATISFACTORY_COUNT || item.unsatisfactory_count || 0,
    'Total Samples': item.TOTAL_SAMPLES || item.total_samples || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unsat Rate');

  // Generate filename
  const fromDate = from.split(' ')[0];
  const toDate = to.split(' ')[0];
  const provinceText = province === 'all' ? 'All' : province;
  const filename = `Unsat_Rate_${provinceText}_${fromDate}_to_${toDate}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

/**
 * Export unsatisfactory count data to Excel
 */
export const exportUnsatCountToExcel = (
  data: any[],
  from: string,
  to: string,
  province: string
) => {
  const formattedData = data.map((item, index) => ({
    'Rank': index + 1,
    'Facility Name': item.FACILITY_NAME || item.facility_name || 'Unknown',
    'Province': item.PROVINCE || item.province || '—',
    'Unsatisfactory Count': item.UNSATISFACTORY_COUNT || item.unsatisfactory_count || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unsat Count');

  // Generate filename
  const fromDate = from.split(' ')[0];
  const toDate = to.split(' ')[0];
  const provinceText = province === 'all' ? 'All' : province;
  const filename = `Unsat_Count_${provinceText}_${fromDate}_to_${toDate}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

//Export on the endorsement table
/**
 * Export logbook endorsement records to Excel
 */
export const exportLogbookEndorsementsToExcel = (
  data: { 
    date_input: string;
    labno: string;
    patient_name: string;
    facility_code: string;
    category: string;
    mnemonic: string;
    analytes: string;
    values: string;
    analyst: string;
    analyst_date: string;
    tc: string | null;
    tc_date: string | null;
    qao: string | null;
    qao_date: string | null;
    fun: string | null;
    fun_date: string | null;
  }[],
  selectedDate: string
) => {
  const formattedData = data.map((item) => ({
    'Date': item.date_input ? item.date_input.slice(0, 10) : '—',
    'Lab No.': item.labno ?? '—',
    'Patient Name': item.patient_name ?? '—',
    'Facility Code': item.facility_code ?? '—',
    'Category': item.category ?? '—',
    'Mnemonic': item.mnemonic ?? '—',
    'Analytes': item.analytes ?? '—',
    'Values': item.values ?? '—',
    'Analyst': item.analyst ?? '—',
    'Analyst Date': item.analyst_date ? item.analyst_date.slice(0, 10) : '—',
    'TC': item.tc ?? '—',
    'TC Date': item.tc_date ? item.tc_date.slice(0, 10) : '—',
    'LM / QAO': item.qao ?? '—',
    'LM / QAO Date': item.qao_date ? item.qao_date.slice(0, 10) : '—',
    'FUN': item.fun ?? '—',
    'FUN Date': item.fun_date ? item.fun_date.slice(0, 10) : '—',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Endorsements');

  const filename = `Logbook_Endorsements_${selectedDate}.xlsx`;
  XLSX.writeFile(workbook, filename);
};