/**
 * Admin Helper Functions
 * Wrapper functions để tương thích với code cũ từ @/lib/auth
 */

import { userManager } from '@/lib/userManager';
import { apiGet, apiPost, apiPut } from '@/lib/api-client';

// Mock data cho backward compatibility
const mockDeposits: any[] = [];
const mockWithdrawals: any[] = [];
const mockPurchases: any[] = [];

/**
 * Get user data (synchronous - từ cache)
 * Note: Real data should be loaded via API hoặc userManager.getAllUsers()
 * @deprecated Dùng getUsers từ database.ts thay thế
 */
export function getUserData(): any[] {
  // Try to get from localStorage cache (for backward compatibility)
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(localStorage);
      const users: any[] = [];
      keys.forEach(key => {
        if (key.startsWith('user_') || key === 'currentUser' || key === 'qtusdev_user') {
          try {
            const user = JSON.parse(localStorage.getItem(key) || '{}');
            if (user.uid || user.email) {
              users.push(user);
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      });
      return users;
    } catch (error) {
      console.warn('Error getting users from localStorage:', error);
    }
  }
  
  // Return empty array if no cache
  return [];
}

/**
 * Save user data
 * @deprecated Dùng userManager.saveUserData thay thế
 */
export async function saveUserData(userData: any): Promise<void> {
  if (userData.uid) {
    await userManager.saveUserData(userData.uid, userData);
  }
}

/**
 * Get deposits (synchronous - từ cache)
 * Note: Real data should be loaded via loadDepositsAndWithdrawals() first
 */
export function getDeposits(): any[] {
  return mockDeposits;
}

/**
 * Get withdrawals (synchronous - từ cache)
 * Note: Real data should be loaded via loadDepositsAndWithdrawals() first
 */
export function getWithdrawals(): any[] {
  return mockWithdrawals;
}

/**
 * Save deposit (approve/update or create)
 */
export async function saveDeposit(depositData: any): Promise<void> {
  if (depositData.id) {
    // Update existing (admin approve)
    await apiPut('/api/deposits', {
      depositId: depositData.id,
      status: depositData.status || 'approved',
      approvedBy: depositData.approvedBy,
    });
  } else {
    // Create new (user-like path)
    await apiPost('/api/deposits', {
      userId: depositData.userId || depositData.user_id,
      amount: depositData.amount,
      method: depositData.method || 'unknown',
      transactionId: depositData.transactionId || depositData.transaction_id || '',
    });
  }

  // Reload để có dữ liệu mới nhất
  await loadDepositsAndWithdrawals();
}

/**
 * Save withdrawal (approve/update or create)
 */
export async function saveWithdrawal(withdrawalData: any): Promise<void> {
  if (withdrawalData.id) {
    // Update existing (admin approve)
    await apiPut('/api/withdrawals', {
      withdrawalId: withdrawalData.id,
      status: withdrawalData.status || 'approved',
      approvedBy: withdrawalData.approvedBy,
    });
  } else {
    // Create new
    await apiPost('/api/withdrawals', {
      userId: withdrawalData.userId || withdrawalData.user_id,
      amount: withdrawalData.amount,
      bankName: withdrawalData.bankName || withdrawalData.bank_name || '',
      accountNumber: withdrawalData.accountNumber || withdrawalData.account_number || '',
      accountName: withdrawalData.accountName || withdrawalData.account_name || '',
    });
  }

  // Reload để có dữ liệu mới nhất
  await loadDepositsAndWithdrawals();
}

/**
 * Save notification (via API)
 */
export async function saveNotification(notificationData: any): Promise<any> {
  try {
    const result = await apiPost('/api/save-notification', {
      userId: notificationData.userId || notificationData.user_id,
      title: notificationData.title || 'Thông báo',
      message: notificationData.message || notificationData.content || '',
      type: notificationData.type || 'system',
      read: notificationData.read || false,
    });

    return { success: true, id: result.id || result.notificationId };
  } catch (error) {
    console.error('Error saving notification:', error);
    return { success: false, error };
  }
}

/**
 * Real-time change listeners (stubs - use API polling instead)
 * @deprecated Dùng API polling hoặc WebSocket thay thế
 */
export function onUsersChange(callback: (users: any[]) => void): () => void {
  // Stub - no-op for now
  // In production, should use WebSocket or API polling
  return () => {};
}

export function onDepositsChange(callback: (deposits: any[]) => void): () => void {
  // Stub - no-op for now
  return () => {};
}

export function onWithdrawalsChange(callback: (withdrawals: any[]) => void): () => void {
  // Stub - no-op for now
  return () => {};
}

export function onPurchasesChange(callback: (purchases: any[]) => void): () => void {
  // Stub - no-op for now
  return () => {};
}

/**
 * Load deposits và withdrawals từ API và update cache
 */
export async function loadDepositsAndWithdrawals(): Promise<{ deposits: any[], withdrawals: any[] }> {
  try {
    const [depositsResult, withdrawalsResult] = await Promise.all([
      apiGet('/api/deposits'),
      apiGet('/api/withdrawals'),
    ]);

    const deposits = (depositsResult.deposits || []).map((d: any) => ({
      ...d,
      timestamp: d.timestamp || d.created_at,
      user_id: d.user_id,
      userEmail: d.userEmail || d.user_email,
      userName: d.userName || d.user_name,
    }));

    const withdrawals = (withdrawalsResult.withdrawals || []).map((w: any) => ({
      ...w,
      timestamp: w.created_at || w.timestamp,
      user_id: w.user_id,
      userEmail: w.userEmail || w.user_email,
      userName: w.userName || w.user_name,
    }));

    // Update cache
    mockDeposits.length = 0;
    mockDeposits.push(...deposits);

    mockWithdrawals.length = 0;
    mockWithdrawals.push(...withdrawals);

    return { deposits: mockDeposits, withdrawals: mockWithdrawals };
  } catch (error) {
    console.error('Error loading deposits and withdrawals:', error);
    return { deposits: [], withdrawals: [] };
  }
}

