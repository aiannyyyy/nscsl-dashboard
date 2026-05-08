import api from '../api';

export interface PatientResultTable {
    LABNO: string;
    LNAME: string;
    FNAME: string;
    DTRECV: string;
    SUBMID: string;
    TWIN: string;
    MNEMONICS: string;
}

export interface PatientResultResponse {
    success: boolean;
    date: string;
    total: number;
    data: PatientResultTable[];
}

export const getPatientResultTable = async (date: string): Promise<PatientResultResponse> => {
    const response = await api.get('/followup/cms-urgent/patient-results', {
        params: { date }
    });
    return response.data;
};