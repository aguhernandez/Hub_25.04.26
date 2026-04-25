import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, MapPin, Globe, Lock, Trophy, Activity, ArrowRight, Shield } from 'lucide-react';
import asciendeLogoWhite from '../assets/Asciende_logo_blanco.png';

interface Team {
  id: string;
  name: string;
  description: string;
  sport: string;
  country: string;
  is_public: boolean;
  is_asciende_official: boolean;
  language: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    sport: string | null;
    country: string | null;
  };
}

export default function PublicTeamPage() {
  const slug = window.location.pathname.split('/').filter(Boolean)[1];

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    (async () => {
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('*')
        .or(`name.ilike.${slug},id.eq.${slug}`)
        .eq('is_public', true)
        .maybeSingle();

      if (error || !teamData) { setNotFound(true); setLoading(false); return; }

      setTeam(teamData);

      const { data: memberData } = await supabase
        .from('team_members')
        .select('id, role, profiles(id, full_name, avatar_url, sport, country)')
        .eq('team_id', teamData.id)
        .limit(24);

      setMembers((memberData as unknown as TeamMember[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#070A0F] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !team) {
    return (
      <div className="min-h-screen bg-[#070A0F] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <img src={asciendeLogoWhite} alt="Asciende" className="h-10 opacity-80" />
        <p className="text-white/50 text-lg">Team not found or is private.</p>
        <a
          href="/"
          className="px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#E8C84A] transition-colors"
        >
          Go to Asciende
        </a>
      </div>
    );
  }

  const coaches = members.filter(m => m.role === 'coach');
  const athletes = members.filter(m => m.role !== 'coach');

  return (
    <div className="min-h-screen bg-[#070A0F] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/4 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/3 blur-[100px]" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-[#070A0F]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={asciendeLogoWhite} alt="Asciende" className="h-8" />
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#E8C84A] transition-colors font-medium"
          >
            Join platform <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-start gap-6 mb-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-9 h-9 text-[#D4AF37]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              {team.is_asciende_official && (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-full text-xs text-[#D4AF37] font-semibold">
                  <Shield className="w-3 h-3" /> Official
                </span>
              )}
              {team.is_public ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/40">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/50 flex-wrap">
              {team.sport && (
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> {team.sport}
                </span>
              )}
              {team.country && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {team.country}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {members.length} member{members.length !== 1 ? 's' : ''}
              </span>
            </div>
            {team.description && (
              <p className="mt-4 text-white/60 leading-relaxed max-w-2xl">{team.description}</p>
            )}
          </div>
        </div>

        {coaches.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-4">Coaching Staff</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {coaches.map(m => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </section>
        )}

        {athletes.length > 0 && (
          <section className="mb-16">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
              Athletes <span className="ml-2 text-white/20 font-normal normal-case tracking-normal">{athletes.length}</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {athletes.map(m => (
                <MemberCard key={m.id} member={m} compact />
              ))}
            </div>
          </section>
        )}

        <div className="border border-[#D4AF37]/15 rounded-2xl p-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent text-center">
          <Activity className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Track your performance with Asciende</h3>
          <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
            The platform used by this team to manage training, nutrition and athletic development.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#E8C84A] transition-colors"
          >
            Get started <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    </div>
  );
}

function MemberCard({ member, compact = false }: { member: TeamMember; compact?: boolean }) {
  const profile = member.profiles;
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className={`bg-white/3 border border-white/8 rounded-xl hover:border-white/15 transition-colors ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex ${compact ? 'flex-col items-center text-center gap-2' : 'items-center gap-3'}`}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className={`rounded-full object-cover flex-shrink-0 ${compact ? 'w-12 h-12' : 'w-10 h-10'}`}
          />
        ) : (
          <div className={`rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center flex-shrink-0 ${compact ? 'w-12 h-12' : 'w-10 h-10'}`}>
            <span className={`text-[#D4AF37] font-bold ${compact ? 'text-sm' : 'text-xs'}`}>{initials}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className={`font-medium text-white truncate ${compact ? 'text-sm' : 'text-sm'}`}>{profile.full_name}</p>
          {!compact && (
            <p className="text-xs text-white/40 truncate">
              {member.role === 'coach' ? 'Coach' : profile.sport || 'Athlete'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
