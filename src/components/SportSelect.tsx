import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Sport {
  name: string;
  nameEs: string;
  category: string;
  categoryEs: string;
}

const sports: Sport[] = [
  // Athletics & Running
  { name: 'Athletics', nameEs: 'Atletismo', category: 'Track & Field', categoryEs: 'Atletismo' },
  { name: 'Running', nameEs: 'Running', category: 'Track & Field', categoryEs: 'Atletismo' },
  { name: 'Marathon', nameEs: 'Maratón', category: 'Track & Field', categoryEs: 'Atletismo' },
  { name: 'Trail Running', nameEs: 'Trail Running', category: 'Track & Field', categoryEs: 'Atletismo' },
  { name: 'Ultra Running', nameEs: 'Ultra Running', category: 'Track & Field', categoryEs: 'Atletismo' },

  // Multi-Sport
  { name: 'Triathlon', nameEs: 'Triatlón', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },
  { name: 'Duathlon', nameEs: 'Duatlón', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },
  { name: 'Aquathlon', nameEs: 'Acuatlón', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },
  { name: 'Modern Pentathlon', nameEs: 'Pentatlón Moderno', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },
  { name: 'Heptathlon', nameEs: 'Heptatlón', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },
  { name: 'Decathlon', nameEs: 'Decatlón', category: 'Multi-Sport', categoryEs: 'Multi-Deporte' },

  // Water Sports
  { name: 'Swimming', nameEs: 'Natación', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Open Water Swimming', nameEs: 'Natación Aguas Abiertas', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Water Polo', nameEs: 'Waterpolo', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Diving', nameEs: 'Clavados', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Synchronized Swimming', nameEs: 'Natación Sincronizada', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Surfing', nameEs: 'Surf', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Rowing', nameEs: 'Remo', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Kayaking', nameEs: 'Kayak', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Canoeing', nameEs: 'Canotaje', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Sailing', nameEs: 'Vela', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },
  { name: 'Stand Up Paddle', nameEs: 'Stand Up Paddle', category: 'Water Sports', categoryEs: 'Deportes Acuáticos' },

  // Cycling
  { name: 'Cycling', nameEs: 'Ciclismo', category: 'Cycling', categoryEs: 'Ciclismo' },
  { name: 'Road Cycling', nameEs: 'Ciclismo de Ruta', category: 'Cycling', categoryEs: 'Ciclismo' },
  { name: 'Mountain Biking', nameEs: 'Mountain Bike', category: 'Cycling', categoryEs: 'Ciclismo' },
  { name: 'Track Cycling', nameEs: 'Ciclismo de Pista', category: 'Cycling', categoryEs: 'Ciclismo' },
  { name: 'BMX', nameEs: 'BMX', category: 'Cycling', categoryEs: 'Ciclismo' },
  { name: 'Gravel Cycling', nameEs: 'Gravel', category: 'Cycling', categoryEs: 'Ciclismo' },

  // Team Sports - Ball
  { name: 'Soccer', nameEs: 'Fútbol', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Football', nameEs: 'Fútbol Americano', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Basketball', nameEs: 'Baloncesto', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Volleyball', nameEs: 'Vóleibol', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Beach Volleyball', nameEs: 'Vóley Playa', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Handball', nameEs: 'Balonmano', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Rugby', nameEs: 'Rugby', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Rugby 7s', nameEs: 'Rugby 7', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Baseball', nameEs: 'Béisbol', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Softball', nameEs: 'Softbol', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Cricket', nameEs: 'Cricket', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Field Hockey', nameEs: 'Hockey sobre Césped', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Ice Hockey', nameEs: 'Hockey sobre Hielo', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Beach Soccer', nameEs: 'Fútbol Playa', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },
  { name: 'Futsal', nameEs: 'Fútbol Sala', category: 'Team Sports', categoryEs: 'Deportes de Equipo' },

  // Racquet Sports
  { name: 'Tennis', nameEs: 'Tenis', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },
  { name: 'Padel', nameEs: 'Pádel', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },
  { name: 'Badminton', nameEs: 'Bádminton', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },
  { name: 'Table Tennis', nameEs: 'Tenis de Mesa', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },
  { name: 'Squash', nameEs: 'Squash', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },
  { name: 'Racquetball', nameEs: 'Racquetball', category: 'Racquet Sports', categoryEs: 'Deportes de Raqueta' },

  // Combat Sports & Martial Arts
  { name: 'Boxing', nameEs: 'Boxeo', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Kickboxing', nameEs: 'Kickboxing', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'MMA', nameEs: 'MMA', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Muay Thai', nameEs: 'Muay Thai', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Judo', nameEs: 'Judo', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Karate', nameEs: 'Karate', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Taekwondo', nameEs: 'Taekwondo', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Wrestling', nameEs: 'Lucha', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Jiu-Jitsu', nameEs: 'Jiu-Jitsu', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Brazilian Jiu-Jitsu', nameEs: 'Jiu-Jitsu Brasileño', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },
  { name: 'Fencing', nameEs: 'Esgrima', category: 'Combat Sports', categoryEs: 'Deportes de Combate' },

  // Strength & Fitness
  { name: 'CrossFit', nameEs: 'CrossFit', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Hyrox', nameEs: 'Hyrox', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Weightlifting', nameEs: 'Halterofilia', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Powerlifting', nameEs: 'Powerlifting', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Bodybuilding', nameEs: 'Culturismo', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Functional Training', nameEs: 'Entrenamiento Funcional', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Calisthenics', nameEs: 'Calistenia', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },
  { name: 'Strongman', nameEs: 'Strongman', category: 'Strength & Fitness', categoryEs: 'Fuerza y Fitness' },

  // Gymnastics
  { name: 'Gymnastics', nameEs: 'Gimnasia', category: 'Gymnastics', categoryEs: 'Gimnasia' },
  { name: 'Artistic Gymnastics', nameEs: 'Gimnasia Artística', category: 'Gymnastics', categoryEs: 'Gimnasia' },
  { name: 'Rhythmic Gymnastics', nameEs: 'Gimnasia Rítmica', category: 'Gymnastics', categoryEs: 'Gimnasia' },
  { name: 'Trampoline', nameEs: 'Trampolín', category: 'Gymnastics', categoryEs: 'Gimnasia' },

  // Mind-Body
  { name: 'Yoga', nameEs: 'Yoga', category: 'Mind-Body', categoryEs: 'Mente-Cuerpo' },
  { name: 'Pilates', nameEs: 'Pilates', category: 'Mind-Body', categoryEs: 'Mente-Cuerpo' },
  { name: 'Tai Chi', nameEs: 'Tai Chi', category: 'Mind-Body', categoryEs: 'Mente-Cuerpo' },
  { name: 'Meditation', nameEs: 'Meditación', category: 'Mind-Body', categoryEs: 'Mente-Cuerpo' },

  // Winter Sports
  { name: 'Skiing', nameEs: 'Esquí', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Alpine Skiing', nameEs: 'Esquí Alpino', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Cross-Country Skiing', nameEs: 'Esquí de Fondo', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Snowboarding', nameEs: 'Snowboard', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Ice Skating', nameEs: 'Patinaje sobre Hielo', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Figure Skating', nameEs: 'Patinaje Artístico', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Speed Skating', nameEs: 'Patinaje de Velocidad', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Curling', nameEs: 'Curling', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },
  { name: 'Biathlon', nameEs: 'Biatlón', category: 'Winter Sports', categoryEs: 'Deportes de Invierno' },

  // Extreme & Action Sports
  { name: 'Rock Climbing', nameEs: 'Escalada', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Sport Climbing', nameEs: 'Escalada Deportiva', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Bouldering', nameEs: 'Búlder', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Skateboarding', nameEs: 'Skateboarding', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Parkour', nameEs: 'Parkour', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Skydiving', nameEs: 'Paracaidismo', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Bungee Jumping', nameEs: 'Bungee Jumping', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },
  { name: 'Base Jumping', nameEs: 'Base Jumping', category: 'Extreme Sports', categoryEs: 'Deportes Extremos' },

  // Equestrian
  { name: 'Equestrian', nameEs: 'Equitación', category: 'Equestrian', categoryEs: 'Ecuestre' },
  { name: 'Dressage', nameEs: 'Doma', category: 'Equestrian', categoryEs: 'Ecuestre' },
  { name: 'Show Jumping', nameEs: 'Salto', category: 'Equestrian', categoryEs: 'Ecuestre' },
  { name: 'Eventing', nameEs: 'Concurso Completo', category: 'Equestrian', categoryEs: 'Ecuestre' },

  // Target Sports
  { name: 'Archery', nameEs: 'Tiro con Arco', category: 'Target Sports', categoryEs: 'Deportes de Precisión' },
  { name: 'Shooting', nameEs: 'Tiro Deportivo', category: 'Target Sports', categoryEs: 'Deportes de Precisión' },
  { name: 'Golf', nameEs: 'Golf', category: 'Target Sports', categoryEs: 'Deportes de Precisión' },
  { name: 'Bowling', nameEs: 'Bolos', category: 'Target Sports', categoryEs: 'Deportes de Precisión' },
  { name: 'Darts', nameEs: 'Dardos', category: 'Target Sports', categoryEs: 'Deportes de Precisión' },

  // Dance & Performance
  { name: 'Dance', nameEs: 'Danza', category: 'Dance & Performance', categoryEs: 'Danza y Performance' },
  { name: 'Ballet', nameEs: 'Ballet', category: 'Dance & Performance', categoryEs: 'Danza y Performance' },
  { name: 'Breakdancing', nameEs: 'Breaking', category: 'Dance & Performance', categoryEs: 'Danza y Performance' },
  { name: 'Cheerleading', nameEs: 'Cheerleading', category: 'Dance & Performance', categoryEs: 'Danza y Performance' },

  // Motor Sports
  { name: 'Motor Racing', nameEs: 'Automovilismo', category: 'Motor Sports', categoryEs: 'Deportes de Motor' },
  { name: 'Motorcycle Racing', nameEs: 'Motociclismo', category: 'Motor Sports', categoryEs: 'Deportes de Motor' },
  { name: 'Karting', nameEs: 'Karting', category: 'Motor Sports', categoryEs: 'Deportes de Motor' },

  // Other
  { name: 'Other', nameEs: 'Otro', category: 'Other', categoryEs: 'Otro' },
];

interface SportSelectProps {
  value: string;
  onChange: (value: string) => void;
  language: 'es' | 'en';
  placeholder?: string;
  className?: string;
}

export default function SportSelect({ value, onChange, language, placeholder, className = '' }: SportSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSport = sports.find(s => s.name === value || s.nameEs === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSports = sports.filter(sport => {
    const searchLower = search.toLowerCase();
    return (
      sport.name.toLowerCase().includes(searchLower) ||
      sport.nameEs.toLowerCase().includes(searchLower) ||
      sport.category.toLowerCase().includes(searchLower) ||
      sport.categoryEs.toLowerCase().includes(searchLower)
    );
  });

  const groupedSports = filteredSports.reduce((acc, sport) => {
    const category = language === 'es' ? sport.categoryEs : sport.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sport);
    return acc;
  }, {} as Record<string, Sport[]>);

  const handleSelect = (sport: Sport) => {
    onChange(language === 'es' ? sport.nameEs : sport.name);
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
        <span className={selectedSport ? '' : 'text-gray-500 dark:text-gray-400'}>
          {selectedSport
            ? (language === 'es' ? selectedSport.nameEs : selectedSport.name)
            : (placeholder || (language === 'es' ? 'Seleccionar deporte...' : 'Select sport...'))
          }
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === 'es' ? 'Buscar deporte...' : 'Search sport...'}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#fdda36]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {Object.entries(groupedSports).map(([category, categoryMajorSports]) => (
              <div key={category}>
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider sticky top-14">
                  {category}
                </div>
                {categoryMajorSports.map((sport) => (
                  <button
                    key={sport.name}
                    type="button"
                    onClick={() => handleSelect(sport)}
                    className="w-full px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {language === 'es' ? sport.nameEs : sport.name}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {filteredSports.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {language === 'es' ? 'No se encontraron deportes' : 'No sports found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
