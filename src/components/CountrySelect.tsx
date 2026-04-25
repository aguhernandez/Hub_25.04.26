import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  nameEs: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'AR', name: 'Argentina', nameEs: 'Argentina', flag: '🇦🇷' },
  { code: 'AU', name: 'Australia', nameEs: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', nameEs: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', nameEs: 'Bélgica', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', nameEs: 'Brasil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', nameEs: 'Canadá', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', nameEs: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', nameEs: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', nameEs: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', nameEs: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CU', name: 'Cuba', nameEs: 'Cuba', flag: '🇨🇺' },
  { code: 'CZ', name: 'Czech Republic', nameEs: 'República Checa', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', nameEs: 'Dinamarca', flag: '🇩🇰' },
  { code: 'DO', name: 'Dominican Republic', nameEs: 'República Dominicana', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', nameEs: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', nameEs: 'Egipto', flag: '🇪🇬' },
  { code: 'FI', name: 'Finland', nameEs: 'Finlandia', flag: '🇫🇮' },
  { code: 'FR', name: 'France', nameEs: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', nameEs: 'Alemania', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', nameEs: 'Grecia', flag: '🇬🇷' },
  { code: 'GT', name: 'Guatemala', nameEs: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', name: 'Honduras', nameEs: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', nameEs: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', nameEs: 'Hungría', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', nameEs: 'Islandia', flag: '🇮🇸' },
  { code: 'IN', name: 'India', nameEs: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', nameEs: 'Indonesia', flag: '🇮🇩' },
  { code: 'IE', name: 'Ireland', nameEs: 'Irlanda', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', nameEs: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', nameEs: 'Italia', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', nameEs: 'Japón', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', nameEs: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', nameEs: 'México', flag: '🇲🇽' },
  { code: 'NL', name: 'Netherlands', nameEs: 'Países Bajos', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', nameEs: 'Nueva Zelanda', flag: '🇳🇿' },
  { code: 'NO', name: 'Norway', nameEs: 'Noruega', flag: '🇳🇴' },
  { code: 'PA', name: 'Panama', nameEs: 'Panamá', flag: '🇵🇦' },
  { code: 'PY', name: 'Paraguay', nameEs: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', nameEs: 'Perú', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', nameEs: 'Filipinas', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', nameEs: 'Polonia', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', nameEs: 'Portugal', flag: '🇵🇹' },
  { code: 'PR', name: 'Puerto Rico', nameEs: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'RO', name: 'Romania', nameEs: 'Rumania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', nameEs: 'Rusia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', nameEs: 'Arabia Saudita', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', nameEs: 'Singapur', flag: '🇸🇬' },
  { code: 'ZA', name: 'South Africa', nameEs: 'Sudáfrica', flag: '🇿🇦' },
  { code: 'ES', name: 'Spain', nameEs: 'España', flag: '🇪🇸' },
  { code: 'SE', name: 'Sweden', nameEs: 'Suecia', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', nameEs: 'Suiza', flag: '🇨🇭' },
  { code: 'TW', name: 'Taiwan', nameEs: 'Taiwán', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', nameEs: 'Tailandia', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', nameEs: 'Turquía', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', nameEs: 'Ucrania', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameEs: 'Emiratos Árabes Unidos', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', nameEs: 'Reino Unido', flag: '🇬🇧' },
  { code: 'US', name: 'United States', nameEs: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', nameEs: 'Uruguay', flag: '🇺🇾' },
  { code: 'VE', name: 'Venezuela', nameEs: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', nameEs: 'Vietnam', flag: '🇻🇳' },
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  language: 'es' | 'en';
  className?: string;
}

export default function CountrySelect({ value, onChange, language, className = '' }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = countries.find(c => c.name === value || c.nameEs === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(country => {
    const searchLower = search.toLowerCase();
    return (
      country.name.toLowerCase().includes(searchLower) ||
      country.nameEs.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (country: Country) => {
    onChange(language === 'es' ? country.nameEs : country.name);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] flex items-center justify-between ${className}`}
      >
        <div className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <span className="text-2xl">{selectedCountry.flag}</span>
              <span>{language === 'es' ? selectedCountry.nameEs : selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              {language === 'es' ? 'Seleccionar país...' : 'Select country...'}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'es' ? 'Buscar país...' : 'Search country...'}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
              >
                <span className="text-2xl">{country.flag}</span>
                <span className="text-gray-900 dark:text-white">
                  {language === 'es' ? country.nameEs : country.name}
                </span>
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {language === 'es' ? 'No se encontraron países' : 'No countries found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
