import { createContext, useContext, useState, ReactNode } from 'react';

interface CalculatedMacros {
  bmr: number;
  tdee: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_percent: number;
  carbs_percent: number;
  fat_percent: number;
}

interface AthleteContextType {
  selectedAthleteId: string | null;
  selectedAthleteName: string | null;
  calculatedMacros: CalculatedMacros | null;
  setSelectedAthlete: (id: string, name: string) => void;
  setCalculatedMacros: (macros: CalculatedMacros | null) => void;
  clearSelectedAthlete: () => void;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);

export function AthleteProvider({ children }: { children: ReactNode }) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedAthleteName, setSelectedAthleteName] = useState<string | null>(null);
  const [calculatedMacros, setCalculatedMacros] = useState<CalculatedMacros | null>(null);

  const setSelectedAthlete = (id: string, name: string) => {
    setSelectedAthleteId(id);
    setSelectedAthleteName(name);
  };

  const clearSelectedAthlete = () => {
    setSelectedAthleteId(null);
    setSelectedAthleteName(null);
    setCalculatedMacros(null);
  };

  return (
    <AthleteContext.Provider
      value={{
        selectedAthleteId,
        selectedAthleteName,
        calculatedMacros,
        setSelectedAthlete,
        setCalculatedMacros,
        clearSelectedAthlete,
      }}
    >
      {children}
    </AthleteContext.Provider>
  );
}

export function useAthlete() {
  const context = useContext(AthleteContext);
  if (context === undefined) {
    throw new Error('useAthlete must be used within an AthleteProvider');
  }
  return context;
}
