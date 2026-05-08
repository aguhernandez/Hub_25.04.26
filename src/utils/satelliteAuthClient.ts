/**
 * Satellite Authentication Client
 *
 * Provides unified authentication for all Asciende satellites (Lab, Endurance, Nutrition, Motion, Performance)
 * All satellites authenticate against the Hub Supabase instance.
 *
 * Usage:
 * const auth = new SatelliteAuthClient('lab');
 * const result = await auth.login('email@example.com', 'password');
 */

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    membership_slug: string;
    membership_name: string;
  };
}

interface AuthError {
  error: string;
}

type SatelliteType = 'academy' | 'lab' | 'endurance' | 'nutrition' | 'motion' | 'performance';

export class SatelliteAuthClient {
  private readonly HUB_URL = 'https://ngkcbygyoobqhlmlnuvl.supabase.co';
  private satellite: SatelliteType;
  private tokenKey: string;
  private userDataKey: string;

  constructor(satellite: SatelliteType) {
    this.satellite = satellite;
    this.tokenKey = `${satellite}_auth_token`;
    this.userDataKey = `${satellite}_user_data`;
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const url = `${this.HUB_URL}/functions/v1/${this.satellite}-auth`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData: AuthError = await response.json();
        throw new Error(errorData.error || `Authentication failed with status ${response.status}`);
      }

      const data: AuthResponse = await response.json();

      // Store token and user data
      this.setToken(data.token);
      this.setUserData(data.user);

      return data;
    } catch (error) {
      console.error(`[${this.satellite}] Authentication error:`, error);
      throw error;
    }
  }

  /**
   * Logout user (clear stored credentials)
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userDataKey);
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set token in storage
   */
  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Get stored user data
   */
  getUserData(): AuthResponse['user'] | null {
    const data = localStorage.getItem(this.userDataKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Set user data in storage
   */
  private setUserData(user: AuthResponse['user']): void {
    localStorage.setItem(this.userDataKey, JSON.stringify(user));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Decode JWT token (without verification)
   * NOTE: This only decodes - it doesn't verify the signature
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');

      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Token decode error:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = this.decodeToken(token);
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired or about to expire (within 1 hour)
   */
  isTokenExpiringSoon(minutesThreshold: number = 60): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const now = new Date();
    const timeUntilExpiration = expiration.getTime() - now.getTime();
    const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

    return minutesUntilExpiration < minutesThreshold;
  }

  /**
   * Get user role for authorization checks
   */
  getUserRole(): string | null {
    const user = this.getUserData();
    return user?.role ?? null;
  }

  /**
   * Get user membership level
   */
  getMembershipSlug(): string | null {
    const user = this.getUserData();
    return user?.membership_slug ?? null;
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    return this.getUserRole() === role;
  }

  /**
   * Check if user has at least a specific membership level
   * Membership hierarchy: inicia < basico < pro < elite
   */
  hasMembership(level: 'inicia' | 'basico' | 'pro' | 'elite'): boolean {
    const membershipHierarchy = ['inicia', 'basico', 'pro', 'elite'];
    const userMembership = this.getMembershipSlug();

    if (!userMembership) return false;

    const userLevel = membershipHierarchy.indexOf(userMembership);
    const requiredLevel = membershipHierarchy.indexOf(level);

    return userLevel >= requiredLevel;
  }
}

/**
 * Global auth instances for each satellite
 * Import and use: import { labAuth } from '@/utils/satelliteAuthClient';
 */
export const academyAuth = new SatelliteAuthClient('academy');
export const labAuth = new SatelliteAuthClient('lab');
export const enduranceAuth = new SatelliteAuthClient('endurance');
export const nutritionAuth = new SatelliteAuthClient('nutrition');
export const motionAuth = new SatelliteAuthClient('motion');
export const performanceAuth = new SatelliteAuthClient('performance');
