export interface UserProfile {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  avatarUrl?: string;
}

class AuthService {
  private currentUser: UserProfile | null = null;

  /**
   * Simulates an SSO login flow.
   * In a real app, this would open a browser window to the IDP (Okta, Azure AD).
   */
  async loginWithSSO(): Promise<UserProfile> {
    return new Promise(resolve => {
      setTimeout(() => {
        const mockUser: UserProfile = {
          id: 'usr_88293',
          name: 'Commander Shepard',
          email: 'shepard@alliance.gov',
          organization: 'Systems Alliance',
          role: 'ADMIN',
          avatarUrl: 'https://via.placeholder.com/150',
        };
        this.currentUser = mockUser;
        resolve(mockUser);
      }, 1500); // Simulate network latency
    });
  }

  async logout(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.currentUser = null;
        resolve();
      }, 500);
    });
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }
}

export const authService = new AuthService();
