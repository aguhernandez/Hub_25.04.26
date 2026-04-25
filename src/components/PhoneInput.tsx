import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface CountryCode {
  code: string;
  name: string;
  nameEs: string;
  flag: string;
  dialCode: string;
}

const countryCodes: CountryCode[] = [
  { code: 'AR', name: 'Argentina', nameEs: 'Argentina', flag: '🇦🇷', dialCode: '+54' },
  { code: 'AU', name: 'Australia', nameEs: 'Australia', flag: '🇦🇺', dialCode: '+61' },
  { code: 'AT', name: 'Austria', nameEs: 'Austria', flag: '🇦🇹', dialCode: '+43' },
  { code: 'BE', name: 'Belgium', nameEs: 'Bélgica', flag: '🇧🇪', dialCode: '+32' },
  { code: 'BR', name: 'Brazil', nameEs: 'Brasil', flag: '🇧🇷', dialCode: '+55' },
  { code: 'CA', name: 'Canada', nameEs: 'Canadá', flag: '🇨🇦', dialCode: '+1' },
  { code: 'CL', name: 'Chile', nameEs: 'Chile', flag: '🇨🇱', dialCode: '+56' },
  { code: 'CN', name: 'China', nameEs: 'China', flag: '🇨🇳', dialCode: '+86' },
  { code: 'CO', name: 'Colombia', nameEs: 'Colombia', flag: '🇨🇴', dialCode: '+57' },
  { code: 'CR', name: 'Costa Rica', nameEs: 'Costa Rica', flag: '🇨🇷', dialCode: '+506' },
  { code: 'CU', name: 'Cuba', nameEs: 'Cuba', flag: '🇨🇺', dialCode: '+53' },
  { code: 'CZ', name: 'Czech Republic', nameEs: 'República Checa', flag: '🇨🇿', dialCode: '+420' },
  { code: 'DK', name: 'Denmark', nameEs: 'Dinamarca', flag: '🇩🇰', dialCode: '+45' },
  { code: 'DO', name: 'Dominican Republic', nameEs: 'República Dominicana', flag: '🇩🇴', dialCode: '+1' },
  { code: 'EC', name: 'Ecuador', nameEs: 'Ecuador', flag: '🇪🇨', dialCode: '+593' },
  { code: 'EG', name: 'Egypt', nameEs: 'Egipto', flag: '🇪🇬', dialCode: '+20' },
  { code: 'FI', name: 'Finland', nameEs: 'Finlandia', flag: '🇫🇮', dialCode: '+358' },
  { code: 'FR', name: 'France', nameEs: 'Francia', flag: '🇫🇷', dialCode: '+33' },
  { code: 'DE', name: 'Germany', nameEs: 'Alemania', flag: '🇩🇪', dialCode: '+49' },
  { code: 'GR', name: 'Greece', nameEs: 'Grecia', flag: '🇬🇷', dialCode: '+30' },
  { code: 'GT', name: 'Guatemala', nameEs: 'Guatemala', flag: '🇬🇹', dialCode: '+502' },
  { code: 'HN', name: 'Honduras', nameEs: 'Honduras', flag: '🇭🇳', dialCode: '+504' },
  { code: 'HK', name: 'Hong Kong', nameEs: 'Hong Kong', flag: '🇭🇰', dialCode: '+852' },
  { code: 'HU', name: 'Hungary', nameEs: 'Hungría', flag: '🇭🇺', dialCode: '+36' },
  { code: 'IS', name: 'Iceland', nameEs: 'Islandia', flag: '🇮🇸', dialCode: '+354' },
  { code: 'IN', name: 'India', nameEs: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'ID', name: 'Indonesia', nameEs: 'Indonesia', flag: '🇮🇩', dialCode: '+62' },
  { code: 'IE', name: 'Ireland', nameEs: 'Irlanda', flag: '🇮🇪', dialCode: '+353' },
  { code: 'IL', name: 'Israel', nameEs: 'Israel', flag: '🇮🇱', dialCode: '+972' },
  { code: 'IT', name: 'Italy', nameEs: 'Italia', flag: '🇮🇹', dialCode: '+39' },
  { code: 'JP', name: 'Japan', nameEs: 'Japón', flag: '🇯🇵', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', nameEs: 'Corea del Sur', flag: '🇰🇷', dialCode: '+82' },
  { code: 'MX', name: 'Mexico', nameEs: 'México', flag: '🇲🇽', dialCode: '+52' },
  { code: 'NL', name: 'Netherlands', nameEs: 'Países Bajos', flag: '🇳🇱', dialCode: '+31' },
  { code: 'NZ', name: 'New Zealand', nameEs: 'Nueva Zelanda', flag: '🇳🇿', dialCode: '+64' },
  { code: 'NO', name: 'Norway', nameEs: 'Noruega', flag: '🇳🇴', dialCode: '+47' },
  { code: 'PA', name: 'Panama', nameEs: 'Panamá', flag: '🇵🇦', dialCode: '+507' },
  { code: 'PY', name: 'Paraguay', nameEs: 'Paraguay', flag: '🇵🇾', dialCode: '+595' },
  { code: 'PE', name: 'Peru', nameEs: 'Perú', flag: '🇵🇪', dialCode: '+51' },
  { code: 'PH', name: 'Philippines', nameEs: 'Filipinas', flag: '🇵🇭', dialCode: '+63' },
  { code: 'PL', name: 'Poland', nameEs: 'Polonia', flag: '🇵🇱', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', nameEs: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'PR', name: 'Puerto Rico', nameEs: 'Puerto Rico', flag: '🇵🇷', dialCode: '+1' },
  { code: 'RO', name: 'Romania', nameEs: 'Rumania', flag: '🇷🇴', dialCode: '+40' },
  { code: 'RU', name: 'Russia', nameEs: 'Rusia', flag: '🇷🇺', dialCode: '+7' },
  { code: 'SA', name: 'Saudi Arabia', nameEs: 'Arabia Saudita', flag: '🇸🇦', dialCode: '+966' },
  { code: 'SG', name: 'Singapore', nameEs: 'Singapur', flag: '🇸🇬', dialCode: '+65' },
  { code: 'ZA', name: 'South Africa', nameEs: 'Sudáfrica', flag: '🇿🇦', dialCode: '+27' },
  { code: 'ES', name: 'Spain', nameEs: 'España', flag: '🇪🇸', dialCode: '+34' },
  { code: 'SE', name: 'Sweden', nameEs: 'Suecia', flag: '🇸🇪', dialCode: '+46' },
  { code: 'CH', name: 'Switzerland', nameEs: 'Suiza', flag: '🇨🇭', dialCode: '+41' },
  { code: 'TW', name: 'Taiwan', nameEs: 'Taiwán', flag: '🇹🇼', dialCode: '+886' },
  { code: 'TH', name: 'Thailand', nameEs: 'Tailandia', flag: '🇹🇭', dialCode: '+66' },
  { code: 'TR', name: 'Turkey', nameEs: 'Turquía', flag: '🇹🇷', dialCode: '+90' },
  { code: 'UA', name: 'Ukraine', nameEs: 'Ucrania', flag: '🇺🇦', dialCode: '+380' },
  { code: 'AE', name: 'United Arab Emirates', nameEs: 'Emiratos Árabes Unidos', flag: '🇦🇪', dialCode: '+971' },
  { code: 'GB', name: 'United Kingdom', nameEs: 'Reino Unido', flag: '🇬🇧', dialCode: '+44' },
  { code: 'US', name: 'United States', nameEs: 'Estados Unidos', flag: '🇺🇸', dialCode: '+1' },
  { code: 'UY', name: 'Uruguay', nameEs: 'Uruguay', flag: '🇺🇾', dialCode: '+598' },
  { code: 'VE', name: 'Venezuela', nameEs: 'Venezuela', flag: '🇻🇪', dialCode: '+58' },
  { code: 'VN', name: 'Vietnam', nameEs: 'Vietnam', flag: '🇻🇳', dialCode: '+84' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  language: 'es' | 'en';
  className?: string;
}

export default function PhoneInput({ value, onChange, language, className = '' }: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    countryCodes.find(c => c.code === 'AR') || countryCodes[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const country = countryCodes.find(c => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.substring(country.dialCode.length).trim());
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = countryCodes.filter(country => {
    const searchLower = search.toLowerCase();
    return (
      country.name.toLowerCase().includes(searchLower) ||
      country.nameEs.toLowerCase().includes(searchLower) ||
      country.dialCode.includes(searchLower)
    );
  });

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    const fullPhone = phoneNumber ? `${country.dialCode} ${phoneNumber}` : country.dialCode;
    onChange(fullPhone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setPhoneNumber(num);
    const fullPhone = num ? `${selectedCountry.dialCode} ${num}` : selectedCountry.dialCode;
    onChange(fullPhone);
  };

  return (
    <div className="flex gap-2">
      <div ref={dropdownRef} className="relative w-32">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] flex items-center justify-between"
        >
          <div className="flex items-center gap-1">
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-sm">{selectedCountry.dialCode}</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-80 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
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
                  onClick={() => handleCountrySelect(country)}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{country.flag}</span>
                    <span className="text-gray-900 dark:text-white text-sm">
                      {language === 'es' ? country.nameEs : country.name}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">{country.dialCode}</span>
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

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={language === 'es' ? 'Número de teléfono' : 'Phone number'}
        className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#fdda36] ${className}`}
      />
    </div>
  );
}
