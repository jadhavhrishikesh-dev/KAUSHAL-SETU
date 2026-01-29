import React, { createContext, useContext } from 'react';
import { User, AgniveerProfile } from '../../types';
import { RRIResponse, LeaveRequest, Grievance } from './types';
import { translations, Language } from './translations';

interface AgniveerContextType {
    user: User;
    profile: AgniveerProfile | null;
    rriData: RRIResponse | null;
    leaves: LeaveRequest[];
    grievances: Grievance[];
    lang: Language;
    setLang: (lang: Language) => void;
    t: typeof translations.en;
    refreshLeaves: () => void;
    refreshGrievances: () => void;
}

const AgniveerContext = createContext<AgniveerContextType | undefined>(undefined);

export const AgniveerProvider = AgniveerContext.Provider;

export const useAgniveer = () => {
    const context = useContext(AgniveerContext);
    if (!context) throw new Error("useAgniveer must be used within AgniveerProvider");
    return context;
};
