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

export interface DisorderEntry {
    NAME: string;
    RFLAG: string;
    DESCR1: string;
}

export interface PatientDisorderResultTable {
    MAILERNAME: string;
    LABNO: string;
    LNAME: string;
    FNAME: string;
    disorders: DisorderEntry[];
}

export interface PatientDisorderResultResponse {
    success: boolean;
    labno: string;
    total: number;
    data: PatientDisorderResultTable[];
}

export const getPatientDisorderResultTable = async (labno: string): Promise<PatientDisorderResultResponse> => {
    const response = await api.get('/followup/cms-urgent/patient-disorder-results', {
        params: { labno }
    });
    return response.data;
};