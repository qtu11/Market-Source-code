// User Manager - Sync giữa Firebase Firestore và PostgreSQL
// ✅ IMPLEMENTED: Sync logic Firestore ↔ PostgreSQL qua API

export interface UserData {
  uid: string;
  email?: string;
  name?: string;
  balance?: number;
  [key: string]: any;
}

class UserManager {
  /**
   * Get user data từ Firestore hoặc localStorage
   */
  async getUserData(uid: string): Promise<UserData | null> {
    try {
      // Try Firestore first
      if (typeof window !== 'undefined') {
        const firebaseModule = await import('./firebase');
        if (firebaseModule.firestore) {
          const doc = await firebaseModule.firestore
            .collection('users')
            .doc(uid)
            .get();
          
          if (doc.exists) {
            return { uid, ...doc.data() } as UserData;
          }
        }
      }

      // Fallback: localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`user_${uid}`);
          if (stored) {
            return JSON.parse(stored) as UserData;
          }
        } catch (parseError) {
          // Invalid JSON in localStorage, return null
          return null;
        }
      }

      return null;
    } catch (error) {
      // Use logger instead of console
      if (typeof window === 'undefined') {
        const { logger } = await import('./logger');
        logger.warn('UserManager.getUserData error', error as Error);
      }
      return null;
    }
  }

  /**
   * Update balance trong Firestore/localStorage
   */
  async updateBalance(uid: string, newBalance: number): Promise<void> {
    try {
      // Update Firestore
      if (typeof window !== 'undefined') {
        const firebaseModule = await import('./firebase');
        if (firebaseModule.firestore) {
          await firebaseModule.firestore
            .collection('users')
            .doc(uid)
            .update({ balance: newBalance });
        }
      }

      // Update localStorage
      if (typeof window !== 'undefined') {
        const userData = await this.getUserData(uid);
        if (userData) {
          userData.balance = newBalance;
          localStorage.setItem(`user_${uid}`, JSON.stringify(userData));
        }
      }
    } catch (error) {
      // Use logger instead of console
      if (typeof window === 'undefined') {
        const { logger } = await import('./logger');
        logger.warn('UserManager.updateBalance error', error as Error);
      }
      // Non-critical, chỉ warn
    }
  }

  /**
   * Save user data
   */
  async saveUserData(uid: string, data: Partial<UserData>): Promise<void> {
    try {
      // Save to Firestore
      if (typeof window !== 'undefined') {
        const firebaseModule = await import('./firebase');
        if (firebaseModule.firestore) {
          await firebaseModule.firestore
            .collection('users')
            .doc(uid)
            .set({ uid, ...data }, { merge: true });
        }
      }

      // Save to localStorage
      if (typeof window !== 'undefined') {
        const existing = await this.getUserData(uid);
        const merged = existing ? { ...existing, ...data, uid } : { ...data, uid };
        localStorage.setItem(`user_${uid}`, JSON.stringify(merged));
        
        // Also update currentUser in localStorage
        localStorage.setItem('currentUser', JSON.stringify(merged));
        
        // Set isLoggedIn flag - REQUIRED for dashboard authentication
        localStorage.setItem('isLoggedIn', 'true');
        
        // Also set qtusdev_user for backward compatibility
        localStorage.setItem('qtusdev_user', JSON.stringify(merged));
      }
    } catch (error) {
      // Use logger instead of console
      if (typeof window === 'undefined') {
        const { logger } = await import('./logger');
        logger.warn('UserManager.saveUserData error', error as Error);
      }
    }
  }

  /**
   * Set user (alias for saveUserData)
   */
  async setUser(userData: UserData): Promise<void> {
    return this.saveUserData(userData.uid, userData);
  }

  /**
   * Get current user from localStorage
   */
  async getUser(): Promise<UserData | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const userStr = localStorage.getItem('currentUser') || localStorage.getItem('qtusdev_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as UserData;
          if (user.uid) {
            // Try to get from Firestore
            const firestoreData = await this.getUserData(user.uid);
            return firestoreData || user;
          }
          return user;
        } catch (parseError) {
          // Invalid JSON, return null
          return null;
        }
      }
      return null;
    } catch (error) {
      // Use logger instead of console
      if (typeof window === 'undefined') {
        const { logger } = await import('./logger');
        logger.warn('UserManager.getUser error', error as Error);
      }
      return null;
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('qtusdev_user');
    return isLoggedIn && !!userStr;
  }

  /**
   * Get all users (from PostgreSQL API, Firestore, or localStorage cache)
   * ✅ FIX: Sync với PostgreSQL database thông qua API
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const users: UserData[] = [];
      
      // ✅ FIX: Ưu tiên lấy từ PostgreSQL database qua API
      if (typeof window !== 'undefined') {
        try {
          const { apiGet } = await import('./api-client');
          const result = await apiGet('/api/users');
          
          // ✅ FIX: API trả về { data: users[], error: null } hoặc { users: [] }
          const usersArray = result?.users || result?.data || [];
          
          if (Array.isArray(usersArray) && usersArray.length > 0) {
            // Map PostgreSQL users sang format UserData
            usersArray.forEach((user: any) => {
              users.push({
                uid: user.id?.toString() || user.uid || '',
                id: user.id,
                email: user.email,
                name: user.name || user.username,
                displayName: user.name || user.username,
                username: user.username,
                avatar_url: user.avatar_url,
                balance: user.balance ? parseFloat(String(user.balance)) : 0,
                role: user.role || 'user',
                createdAt: user.created_at,
                lastActivity: user.last_login || user.updated_at,
                ipAddress: user.ip_address,
                provider: user.provider || 'email',
                ...user
              } as UserData);
            });
            
            // Cache vào localStorage để dùng sau
            if (users.length > 0) {
              users.forEach(user => {
                if (user.uid) {
                  localStorage.setItem(`user_${user.uid}`, JSON.stringify(user));
                }
              });
            }
            
            return users;
          }
        } catch (apiError) {
          // Use logger instead of console
          if (typeof window === 'undefined') {
            const { logger } = await import('./logger');
            logger.warn('UserManager.getAllUsers: API error, falling back to Firestore/localStorage', apiError as Error);
          }
        }
      }
      
      // Fallback: Try Firestore
      if (typeof window !== 'undefined') {
        const firebaseModule = await import('./firebase');
        if (firebaseModule.firestore) {
          const snapshot = await firebaseModule.firestore.collection('users').get();
          snapshot.forEach((doc: any) => {
            users.push({ uid: doc.id, ...doc.data() } as UserData);
          });
        }
      }

      // Fallback: Get từ localStorage
      if (users.length === 0 && typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('user_')) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const user = JSON.parse(stored) as UserData;
                if (user.uid) {
                  users.push(user);
                }
              }
            } catch (e) {
              // Skip invalid entries
            }
          }
        });
      }

      return users;
    } catch (error) {
      // Use logger instead of console
      if (typeof window === 'undefined') {
        const { logger } = await import('./logger');
        logger.warn('UserManager.getAllUsers error', error as Error);
      }
      return [];
    }
  }
}

export const userManager = new UserManager();

