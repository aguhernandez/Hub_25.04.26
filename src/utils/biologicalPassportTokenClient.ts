/**
 * Biological Passport Token Client
 *
 * Handles retrieval of biological passport data in satellite applications (Academy, etc.)
 * using the X-Token-Passport system.
 *
 * The passport token is obtained during login via the satellite-auth functions.
 * This client simplifies fetching and caching passport data.
 *
 * Usage:
 * const passportClient = new BiologicalPassportTokenClient();
 * const passportData = await passportClient.getPassport('token-from-login');
 */

interface BiologicalPassport {
  id: string;
  athlete_id: string;
  sport: string;
  vo2_max: number | null;
  ventilatory_threshold: number | null;
  aerobic_threshold: number | null;
  lactate_threshold: number | null;
  max_heart_rate: number | null;
  resting_heart_rate: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fat_percentage: number | null;
  muscle_mass_kg: number | null;
  body_composition_method: string | null;
  status: string;
  version_number: number;
  source: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

interface AthleteInfo {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string;
}

interface PassportData {
  passport: BiologicalPassport;
  athlete: AthleteInfo;
}

interface PassportResponse {
  success: boolean;
  data: PassportData;
}

export class BiologicalPassportTokenClient {
  private readonly HUB_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
  private readonly ENDPOINT = '/functions/v1/biological-passport-access';
  private passportCache: Map<string, { data: PassportData; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch passport data using token
   */
  async getPassport(token: string, useCache: boolean = true): Promise<PassportData | null> {
    if (!token) return null;

    // Check cache
    if (useCache) {
      const cached = this.passportCache.get(token);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.HUB_URL}${this.ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Token-Passport': token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Passport fetch error (${response.status}):`, errorData.error);
        return null;
      }

      const data: PassportResponse = await response.json();

      if (data.success && data.data) {
        // Cache the result
        this.passportCache.set(token, {
          data: data.data,
          timestamp: Date.now(),
        });

        return data.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching biological passport:', error);
      return null;
    }
  }

  /**
   * Get passport from localStorage token
   */
  async getPassportFromStorage(tokenKey: string = 'academy_passport_token'): Promise<PassportData | null> {
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;

    return this.getPassport(token);
  }

  /**
   * Clear cache for a specific token
   */
  clearCache(token: string): void {
    this.passportCache.delete(token);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.passportCache.clear();
  }

  /**
   * Check if passport has specific data
   */
  hasData(passport: BiologicalPassport | null, field: keyof BiologicalPassport): boolean {
    return passport ? passport[field] !== null && passport[field] !== undefined : false;
  }

  /**
   * Get training zones from passport
   */
  getTrainingZones(passport: BiologicalPassport): {
    z1: [number, number];
    z2: [number, number];
    z3: [number, number];
    z4: [number, number];
    z5: [number, number];
  } | null {
    if (!passport.max_heart_rate || !passport.resting_heart_rate) return null;

    const hrr = passport.max_heart_rate - passport.resting_heart_rate;

    return {
      z1: [
        passport.resting_heart_rate,
        Math.round(passport.resting_heart_rate + hrr * 0.6),
      ],
      z2: [
        Math.round(passport.resting_heart_rate + hrr * 0.6),
        Math.round(passport.resting_heart_rate + hrr * 0.7),
      ],
      z3: [
        Math.round(passport.resting_heart_rate + hrr * 0.7),
        Math.round(passport.resting_heart_rate + hrr * 0.8),
      ],
      z4: [
        Math.round(passport.resting_heart_rate + hrr * 0.8),
        Math.round(passport.resting_heart_rate + hrr * 0.9),
      ],
      z5: [
        Math.round(passport.resting_heart_rate + hrr * 0.9),
        passport.max_heart_rate,
      ],
    };
  }

  /**
   * Get body composition summary
   */
  getBodyComposition(passport: BiologicalPassport): {
    weight: number | null;
    fat_mass: number | null;
    lean_mass: number | null;
    fat_percentage: number | null;
  } | null {
    if (!passport.weight_kg) return null;

    const fat_mass = passport.weight_kg * (passport.fat_percentage || 0) / 100;
    const lean_mass = passport.weight_kg - fat_mass;

    return {
      weight: passport.weight_kg,
      fat_mass: passport.fat_percentage ? fat_mass : null,
      lean_mass: passport.fat_percentage ? lean_mass : null,
      fat_percentage: passport.fat_percentage,
    };
  }

  /**
   * Get aerobic capacity summary
   */
  getAerobicCapacity(passport: BiologicalPassport): {
    vo2_max: number | null;
    ventilatory_threshold: number | null;
    aerobic_threshold: number | null;
    lactate_threshold: number | null;
  } {
    return {
      vo2_max: passport.vo2_max,
      ventilatory_threshold: passport.ventilatory_threshold,
      aerobic_threshold: passport.aerobic_threshold,
      lactate_threshold: passport.lactate_threshold,
    };
  }

  /**
   * Format passport creation date
   */
  getFormattedDate(passport: BiologicalPassport, locale: string = 'es-ES'): string {
    return new Date(passport.created_at).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get days since passport creation
   */
  getDaysSinceCreation(passport: BiologicalPassport): number {
    const created = new Date(passport.created_at).getTime();
    const now = Date.now();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }
}

/**
 * Global instance
 */
export const passportClient = new BiologicalPassportTokenClient();
