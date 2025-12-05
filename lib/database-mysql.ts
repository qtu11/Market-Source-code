// lib/database-mysql.ts
// Layer kết nối MySQL + một số hàm core (user, deposit, withdrawal, purchase, product).
// Env yêu cầu:
// MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD

import mysql from "mysql2/promise"
import { logger } from "./logger"

const isServerless =
  process.env.VERCEL === "1" ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY === "true"

type Pool = ReturnType<typeof mysql.createPool>
type PoolConnection = Awaited<ReturnType<Pool['getConnection']>>

let pool: Pool | null = null

function createPool(): Pool {
  if (!process.env.MYSQL_HOST) throw new Error("MYSQL_HOST is required")
  if (!process.env.MYSQL_DATABASE) throw new Error("MYSQL_DATABASE is required")
  if (!process.env.MYSQL_USER) throw new Error("MYSQL_USER is required")
  if (!process.env.MYSQL_PASSWORD) throw new Error("MYSQL_PASSWORD is required")

  const connectionLimit = isServerless ? 1 : 10

  const newPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
  })

  newPool
    .query("SELECT 1")
    .then(() => logger.info("MySQL connection OK"))
    .catch((err: any) => logger.error("MySQL connection test failed", err))

  return newPool
}

function getPool(): Pool {
  if (!pool) {
    pool = createPool()
  }
  return pool
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const [rows] = await getPool().query(sql, params)
    return rows as T[]
  } catch (err: any) {
    logger.error("MySQL: query error", err, { sql: sql.substring(0, 100) })
    throw err
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

// ===================== USER =====================

export async function getUserByIdMySQL(userId: number) {
  try {
    return await queryOne<any>("SELECT * FROM users WHERE id = ?", [userId])
  } catch (err) {
    logger.error("MySQL: getUserById error", err, { userId })
    throw err
  }
}

export async function getUserByEmailMySQL(email: string) {
  try {
    return await queryOne<any>("SELECT * FROM users WHERE email = ?", [email])
  } catch (err) {
    logger.error("MySQL: getUserByEmail error", err, { email })
    throw err
  }
}

export async function getUserIdByEmailMySQL(email: string): Promise<number | null> {
  try {
    const row = await queryOne<any>("SELECT id FROM users WHERE email = ?", [email])
    return row ? Number(row.id) : null
  } catch (err) {
    logger.error("MySQL: getUserIdByEmail error", err, { email })
    return null
  }
}

export async function createOrUpdateUserMySQL(userData: {
  email: string
  name?: string
  username?: string
  passwordHash?: string
  avatarUrl?: string
  ipAddress?: string
  role?: "user" | "admin"
}) {
  try {
    let finalUsername = userData.username || userData.name || `user_${Date.now()}`

    const existingByUsername = await queryOne<any>(
      "SELECT id FROM users WHERE username = ?",
      [finalUsername],
    )
    if (existingByUsername && userData.username) {
      finalUsername = `${userData.username}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }

    const sql = `
      INSERT INTO users (
        email, name, username, password_hash, avatar_url, ip_address, role, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        username = VALUES(username),
        password_hash = VALUES(password_hash),
        avatar_url = VALUES(avatar_url),
        ip_address = VALUES(ip_address),
        role = VALUES(role),
        updated_at = NOW()
    `

    await query(sql, [
      userData.email,
      userData.name || finalUsername,
      finalUsername,
      userData.passwordHash || null,
      userData.avatarUrl || null,
      userData.ipAddress || null,
      userData.role || "user",
    ])

    const row = await queryOne<any>("SELECT id FROM users WHERE email = ?", [userData.email])
    if (!row) throw new Error("Failed to create/update user")

    return { id: Number(row.id), isNew: false }
  } catch (err) {
    logger.error("MySQL: createOrUpdateUser error", err, { email: userData.email })
    throw err
  }
}

export async function normalizeUserIdMySQL(
  userId: string | number,
  userEmail?: string,
): Promise<number | null> {
  try {
    if (typeof userId === "number") return userId
    if (userEmail) {
      const id = await getUserIdByEmailMySQL(userEmail)
      if (id) return id
    }
    return null
  } catch (err) {
    logger.error("MySQL: normalizeUserId error", err, { userId, userEmail })
    return null
  }
}

// ===================== DEPOSITS =====================

export async function getDepositsMySQL(userId?: number) {
  try {
    let sql = `
      SELECT d.*, u.email, u.username
      FROM deposits d
      LEFT JOIN users u ON d.user_id = u.id
    `
    const params: any[] = []
    if (userId) {
      sql += " WHERE d.user_id = ?"
      params.push(userId)
    }
    sql += " ORDER BY d.timestamp DESC"
    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getDeposits error", err, { userId })
    throw err
  }
}

export async function createDepositMySQL(depositData: {
  userId: string | number
  amount: number
  method: string
  transactionId?: string | null
  userEmail?: string
  userName?: string
}) {
  return withTransaction(async (conn) => {
    const dbUserId = await normalizeUserIdMySQL(depositData.userId, depositData.userEmail)
    if (!dbUserId) throw new Error("Cannot resolve user ID")

    const [result]: any = await conn.query(
      `INSERT INTO deposits (
        user_id, amount, method, transaction_id, user_email, user_name, status, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        dbUserId,
        depositData.amount,
        depositData.method,
        depositData.transactionId || null,
        depositData.userEmail || null,
        depositData.userName || null,
      ],
    )

    const insertId = (result as any).insertId
    return { id: insertId, timestamp: new Date().toISOString() }
  })
}

export async function approveDepositAndUpdateBalanceMySQL(
  depositId: number,
  userId: number,
  amount: number,
  approvedBy: string,
) {
  return withTransaction(async (conn) => {
    const [depRows]: any = await conn.query(
      "SELECT id, user_id, amount, status FROM deposits WHERE id = ? FOR UPDATE",
      [depositId],
    )
    const deposit = depRows[0]
    if (!deposit) throw new Error("Deposit not found")
    if (deposit.status === "approved") throw new Error("Deposit has already been approved")
    if (deposit.status === "rejected") throw new Error("Deposit has been rejected")
    if (Number(deposit.user_id) !== userId) throw new Error("User ID mismatch with deposit")
    if (Number(deposit.amount) !== amount) throw new Error("Amount mismatch with deposit")

    const [userRows]: any = await conn.query(
      "SELECT balance FROM users WHERE id = ? FOR UPDATE",
      [userId],
    )
    const currentBalance = Number(userRows[0]?.balance || 0)
    const newBalance = currentBalance + amount

    await conn.query(
      `UPDATE deposits
       SET status = 'approved',
           approved_time = NOW(),
           approved_by = ?
       WHERE id = ? AND status = 'pending'`,
      [approvedBy, depositId],
    )

    await conn.query(
      "UPDATE users SET balance = ?, updated_at = NOW() WHERE id = ?",
      [newBalance, userId],
    )

    return { success: true, newBalance }
  })
}

export async function updateDepositStatusMySQL(
  depositId: number,
  status: 'pending' | 'approved' | 'rejected',
  approvedBy?: string
) {
  try {
    const updates: string[] = []
    const params: any[] = []

    updates.push('status = ?')
    params.push(status)

    if (status === 'approved' && approvedBy) {
      updates.push('approved_time = NOW()')
      updates.push('approved_by = ?')
      params.push(approvedBy)
    }

    params.push(depositId)

    if (updates.length > 0) {
      await query(
        `UPDATE deposits SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }
  } catch (err) {
    logger.error('MySQL: updateDepositStatus error', err, { depositId, status })
    throw err
  }
}

// ===================== WITHDRAWALS =====================

export async function getWithdrawalsMySQL(userId?: number) {
  try {
    let sql = `
      SELECT w.*, u.email, u.username
      FROM withdrawals w
      LEFT JOIN users u ON w.user_id = u.id
    `
    const params: any[] = []
    if (userId) {
      sql += " WHERE w.user_id = ?"
      params.push(userId)
    }
    sql += " ORDER BY w.created_at DESC"
    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getWithdrawals error", err, { userId })
    throw err
  }
}

export async function createWithdrawalMySQL(withdrawalData: {
  userId: string | number
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
  userEmail?: string
}) {
  return withTransaction(async (conn) => {
    const dbUserId = await normalizeUserIdMySQL(withdrawalData.userId, withdrawalData.userEmail)
    if (!dbUserId) throw new Error("Cannot resolve user ID")

    const [userRows]: any = await conn.query(
      "SELECT balance FROM users WHERE id = ? FOR UPDATE",
      [dbUserId],
    )
    const currentBalance = Number(userRows[0]?.balance || 0)
    if (currentBalance < withdrawalData.amount) throw new Error("Insufficient balance")

    const [pending]: any = await conn.query(
      "SELECT id FROM withdrawals WHERE user_id = ? AND status = 'pending'",
      [dbUserId],
    )
    if (pending.length > 0) {
      throw new Error("You have a pending withdrawal request. Please wait for approval.")
    }

    const [result]: any = await conn.query(
      `INSERT INTO withdrawals (
        user_id, amount, bank_name, account_number, account_name, user_email, status, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        dbUserId,
        withdrawalData.amount,
        withdrawalData.bankName,
        withdrawalData.accountNumber,
        withdrawalData.accountName,
        withdrawalData.userEmail || null,
      ],
    )

    const insertId = (result as any).insertId
    return { id: insertId, createdAt: new Date().toISOString() }
  })
}

export async function approveWithdrawalAndUpdateBalanceMySQL(
  withdrawalId: number,
  userId: number,
  amount: number,
  approvedBy: string,
) {
  return withTransaction(async (conn) => {
    const [wRows]: any = await conn.query(
      "SELECT id, user_id, amount, status FROM withdrawals WHERE id = ? FOR UPDATE",
      [withdrawalId],
    )
    const withdrawal = wRows[0]
    if (!withdrawal) throw new Error("Withdrawal not found")
    if (withdrawal.status === "approved") throw new Error("Withdrawal has already been approved")
    if (withdrawal.status === "rejected") throw new Error("Withdrawal has been rejected")
    if (Number(withdrawal.user_id) !== userId) throw new Error("User ID mismatch with withdrawal")
    if (Number(withdrawal.amount) !== amount) throw new Error("Amount mismatch with withdrawal")

    const [userRows]: any = await conn.query(
      "SELECT balance FROM users WHERE id = ? FOR UPDATE",
      [userId],
    )
    const currentBalance = Number(userRows[0]?.balance || 0)
    if (currentBalance < amount) throw new Error("Insufficient balance")
    const newBalance = currentBalance - amount

    await conn.query(
      `UPDATE withdrawals
       SET status = 'approved',
           approved_time = NOW(),
           approved_by = ?
       WHERE id = ? AND status = 'pending'`,
      [approvedBy, withdrawalId],
    )

    await conn.query(
      "UPDATE users SET balance = ?, updated_at = NOW() WHERE id = ?",
      [newBalance, userId],
    )

    return { success: true, newBalance }
  })
}

export async function updateWithdrawalStatusMySQL(
  withdrawalId: number,
  status: 'pending' | 'approved' | 'rejected',
  approvedBy?: string
) {
  try {
    const updates: string[] = []
    const params: any[] = []

    updates.push('status = ?')
    params.push(status)

    if (status === 'approved' && approvedBy) {
      updates.push('approved_time = NOW()')
      updates.push('approved_by = ?')
      params.push(approvedBy)
    }

    params.push(withdrawalId)

    if (updates.length > 0) {
      await query(
        `UPDATE withdrawals SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }
  } catch (err) {
    logger.error('MySQL: updateWithdrawalStatus error', err, { withdrawalId, status })
    throw err
  }
}

// ===================== PURCHASES =====================

export async function getPurchasesMySQL(userId?: number) {
  try {
    let sql = `
      SELECT p.*, pr.title AS product_title, pr.price, u.email, u.username
      FROM purchases p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN users u ON p.user_id = u.id
    `
    const params: any[] = []
    if (userId) {
      sql += " WHERE p.user_id = ?"
      params.push(userId)
    }
    sql += " ORDER BY p.created_at DESC"
    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getPurchases error", err, { userId })
    throw err
  }
}

export async function createPurchaseMySQL(purchaseData: {
  userId: string | number
  productId: string | number
  amount: number
  userEmail?: string
}) {
  return withTransaction(async (conn) => {
    const dbUserId = await normalizeUserIdMySQL(purchaseData.userId, purchaseData.userEmail)
    if (!dbUserId) throw new Error("Cannot resolve user ID")

    const productIdNum =
      typeof purchaseData.productId === "number"
        ? purchaseData.productId
        : parseInt(purchaseData.productId.toString(), 10)

    const [prdRows]: any = await conn.query(
      "SELECT id, price, is_active FROM products WHERE id = ?",
      [productIdNum],
    )
    const product = prdRows[0]
    if (!product) throw new Error("Product not found")
    if (!product.is_active) throw new Error("Product is not available")

    const price = Number(product.price)
    if (price > purchaseData.amount) {
      throw new Error("Amount must be at least equal to product price")
    }

    const expectedQty = Math.round(purchaseData.amount / price)
    const expectedAmount = expectedQty * price
    if (Math.abs(purchaseData.amount - expectedAmount) > 0.01) {
      throw new Error("Amount must be a multiple of product price")
    }

    const [exist]: any = await conn.query(
      "SELECT id FROM purchases WHERE user_id = ? AND product_id = ?",
      [dbUserId, productIdNum],
    )
    if (exist.length > 0) {
      throw new Error("You have already purchased this product")
    }

    const [userRows]: any = await conn.query(
      "SELECT balance FROM users WHERE id = ? FOR UPDATE",
      [dbUserId],
    )
    const currentBalance = Number(userRows[0]?.balance || 0)
    if (currentBalance < purchaseData.amount) {
      throw new Error("Insufficient balance")
    }

    const [pRows]: any = await conn.query(
      "INSERT INTO purchases (user_id, product_id, amount, created_at) VALUES (?, ?, ?, NOW())",
      [dbUserId, productIdNum, purchaseData.amount],
    )
    const purchaseId = (pRows as any).insertId

    await conn.query(
      "UPDATE users SET balance = balance - ?, updated_at = NOW() WHERE id = ? AND balance >= ?",
      [purchaseData.amount, dbUserId, purchaseData.amount],
    )

    const [after]: any = await conn.query(
      "SELECT balance FROM users WHERE id = ?",
      [dbUserId],
    )
    const finalBalance = Number(after[0]?.balance || 0)

    return { id: Number(purchaseId), newBalance: finalBalance }
  })
}

// ===================== PRODUCTS (đọc cơ bản) =====================

export async function getProductsMySQL(filters?: {
  category?: string
  isActive?: boolean
  limit?: number
  offset?: number
}) {
  try {
    let sql = `
      SELECT p.*, pr.average_rating, pr.total_ratings,
             COALESCE(p.download_count, 0) AS download_count
      FROM products p
      LEFT JOIN product_ratings pr ON p.id = pr.product_id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.category) {
      sql += " AND p.category = ?"
      params.push(filters.category)
    }
    if (filters?.isActive !== undefined) {
      sql += " AND p.is_active = ?"
      params.push(filters.isActive ? 1 : 0)
    }

    sql += " ORDER BY p.created_at DESC"

    if (filters?.limit) {
      sql += " LIMIT ?"
      params.push(filters.limit)
    }
    if (filters?.offset) {
      sql += " OFFSET ?"
      params.push(filters.offset)
    }

    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getProducts error", err, { filters })
    throw err
  }
}

export async function getProductByIdMySQL(productId: number) {
  try {
    const sql = `
      SELECT p.*, pr.average_rating, pr.total_ratings,
             COALESCE(p.download_count, 0) AS download_count
      FROM products p
      LEFT JOIN product_ratings pr ON p.id = pr.product_id
      WHERE p.id = ?
    `
    return await queryOne<any>(sql, [productId])
  } catch (err) {
    logger.error("MySQL: getProductById error", err, { productId })
    throw err
  }
}

// ===================== ALIASES GIỮ NGUYÊN TÊN HÀM CŨ =====================
// Giúp thay thế lib/database.ts bằng lib/database-mysql.ts mà không phải sửa quá nhiều nơi.

export {
  getUserByIdMySQL as getUserById,
  getUserByEmailMySQL as getUserByEmail,
  getUserIdByEmailMySQL as getUserIdByEmail,
  createOrUpdateUserMySQL as createOrUpdateUser,
  getDepositsMySQL as getDeposits,
  createDepositMySQL as createDeposit,
  updateDepositStatusMySQL as updateDepositStatus,
  approveDepositAndUpdateBalanceMySQL as approveDepositAndUpdateBalance,
  getWithdrawalsMySQL as getWithdrawals,
  createWithdrawalMySQL as createWithdrawal,
  updateWithdrawalStatusMySQL as updateWithdrawalStatus,
  approveWithdrawalAndUpdateBalanceMySQL as approveWithdrawalAndUpdateBalance,
  getPurchasesMySQL as getPurchases,
  createPurchaseMySQL as createPurchase,
  getProductsMySQL as getProducts,
  getProductByIdMySQL as getProductById,
}

// ===================== USER PROFILE =====================

export async function getUserProfileByUserIdMySQL(userId: number) {
  try {
    return await queryOne<any>("SELECT * FROM user_profiles WHERE user_id = ?", [userId])
  } catch (err) {
    logger.error("MySQL: getUserProfileByUserId error", err, { userId })
    throw err
  }
}

export async function getUserProfileByEmailMySQL(email: string) {
  try {
    const user = await getUserByEmailMySQL(email)
    if (!user) return null
    return await getUserProfileByUserIdMySQL(user.id)
  } catch (err) {
    logger.error("MySQL: getUserProfileByEmail error", err, { email })
    throw err
  }
}

export async function upsertUserProfileMySQL(profile: {
  userId: number
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  postalCode?: string | null
  socialLinks?: Record<string, string> | null
  twoFactorEnabled?: boolean
  twoFactorSecret?: string | null
  twoFactorBackupCodes?: string | null
}) {
  try {
    const socialLinksJson = profile.socialLinks ? JSON.stringify(profile.socialLinks) : null
    const backupCodesJson = profile.twoFactorBackupCodes ? JSON.stringify(profile.twoFactorBackupCodes) : null

    const [result] = await getPool().execute(
      `INSERT INTO user_profiles (
        user_id, phone, address, city, country, postal_code, 
        social_links, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        address = VALUES(address),
        city = VALUES(city),
        country = VALUES(country),
        postal_code = VALUES(postal_code),
        social_links = VALUES(social_links),
        two_factor_enabled = VALUES(two_factor_enabled),
        two_factor_secret = VALUES(two_factor_secret),
        two_factor_backup_codes = VALUES(two_factor_backup_codes),
        updated_at = NOW()`,
      [
        profile.userId,
        profile.phone ?? null,
        profile.address ?? null,
        profile.city ?? null,
        profile.country ?? null,
        profile.postalCode ?? null,
        socialLinksJson,
        profile.twoFactorEnabled ?? false,
        profile.twoFactorSecret ?? null,
        backupCodesJson,
      ]
    )

    return await getUserProfileByUserIdMySQL(profile.userId)
  } catch (err) {
    logger.error("MySQL: upsertUserProfile error", err, { userId: profile.userId })
    throw err
  }
}

// ===================== 2FA =====================

export async function saveUserTwoFactorSecretMySQL(
  userId: number,
  secret: string,
  backupCodes: string[]
): Promise<void> {
  try {
    const backupCodesJson = JSON.stringify(backupCodes)
    await query(
      `INSERT INTO user_profiles (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
       VALUES (?, TRUE, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         two_factor_enabled = TRUE,
         two_factor_secret = VALUES(two_factor_secret),
         two_factor_backup_codes = VALUES(two_factor_backup_codes),
         updated_at = NOW()`,
      [userId, secret, backupCodesJson]
    )
  } catch (err) {
    logger.error("MySQL: saveUserTwoFactorSecret error", err, { userId })
    throw err
  }
}

export async function disableUserTwoFactorMySQL(userId: number): Promise<void> {
  try {
    await query(
      `INSERT INTO user_profiles (user_id, two_factor_enabled, two_factor_secret, two_factor_backup_codes, updated_at)
       VALUES (?, FALSE, NULL, NULL, NOW())
       ON DUPLICATE KEY UPDATE
         two_factor_enabled = FALSE,
         two_factor_secret = NULL,
         two_factor_backup_codes = NULL,
         updated_at = NOW()`,
      [userId]
    )
  } catch (err) {
    logger.error("MySQL: disableUserTwoFactor error", err, { userId })
    throw err
  }
}

// ===================== PASSWORD RESET =====================

export async function deletePasswordResetTokensMySQL(userId: number) {
  try {
    await query("DELETE FROM password_resets WHERE user_id = ?", [userId])
  } catch (err) {
    logger.error("MySQL: deletePasswordResetTokens error", err, { userId })
    throw err
  }
}

export async function createPasswordResetTokenRecordMySQL(
  userId: number,
  token: string,
  expiresAt: Date
) {
  try {
    await query(
      "INSERT INTO password_resets (user_id, token, expires_at, created_at) VALUES (?, ?, ?, NOW())",
      [userId, token, expiresAt]
    )
  } catch (err) {
    logger.error("MySQL: createPasswordResetTokenRecord error", err, { userId })
    throw err
  }
}

export async function findValidPasswordResetTokenMySQL(token: string) {
  try {
    return await queryOne<any>(
      `SELECT pr.*, u.email, u.id as user_id
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.token = ? AND pr.expires_at > NOW()`,
      [token]
    )
  } catch (err) {
    logger.error("MySQL: findValidPasswordResetToken error", err, { token })
    throw err
  }
}

export async function consumePasswordResetTokenMySQL(token: string) {
  try {
    await query("DELETE FROM password_resets WHERE token = ?", [token])
  } catch (err) {
    logger.error("MySQL: consumePasswordResetToken error", err, { token })
    throw err
  }
}

export async function updateUserPasswordHashMySQL(userId: number, passwordHash: string) {
  try {
    await query("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [
      passwordHash,
      userId,
    ])
  } catch (err) {
    logger.error("MySQL: updateUserPasswordHash error", err, { userId })
    throw err
  }
}

// ===================== PRODUCTS =====================

export async function updateProductMySQL(
  productId: number,
  productData: {
    title?: string
    description?: string
    price?: number
    category?: string
    demoUrl?: string
    downloadUrl?: string
    imageUrl?: string
    tags?: string[] | null
    isActive?: boolean
    averageRating?: number
    downloadCount?: number
  }
) {
  try {
    const updates: string[] = []
    const params: any[] = []

    if (productData.title !== undefined) {
      updates.push("title = ?")
      params.push(productData.title)
    }
    if (productData.description !== undefined) {
      updates.push("description = ?")
      params.push(productData.description)
    }
    if (productData.price !== undefined) {
      updates.push("price = ?")
      params.push(productData.price)
    }
    if (productData.category !== undefined) {
      updates.push("category = ?")
      params.push(productData.category)
    }
    if (productData.demoUrl !== undefined) {
      updates.push("demo_url = ?")
      params.push(productData.demoUrl || null)
    }
    if (productData.downloadUrl !== undefined) {
      updates.push("download_url = ?")
      params.push(productData.downloadUrl || null)
    }
    if (productData.imageUrl !== undefined) {
      updates.push("image_url = ?")
      params.push(productData.imageUrl || null)
    }
    if (productData.tags !== undefined) {
      const tagsJson = productData.tags ? JSON.stringify(productData.tags) : null
      updates.push("tags = ?")
      params.push(tagsJson)
    }
    if (productData.isActive !== undefined) {
      updates.push("is_active = ?")
      params.push(productData.isActive)
    }

    // ✅ FIX: Cho phép admin manually set download_count
    if (productData.downloadCount !== undefined) {
      updates.push("download_count = ?")
      params.push(productData.downloadCount)
    }

    updates.push("updated_at = NOW()")
    params.push(productId)

    if (updates.length > 1) {
      await query(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, params)
    }

    // ✅ FIX: Nếu admin muốn manually set average_rating, update vào product_ratings
    if (productData.averageRating !== undefined) {
      await query(
        `INSERT INTO product_ratings (product_id, average_rating, total_ratings, updated_at)
         VALUES (?, ?, 
           COALESCE((SELECT total_ratings FROM product_ratings WHERE product_id = ?), 0),
           NOW())
         ON DUPLICATE KEY UPDATE
           average_rating = VALUES(average_rating),
           updated_at = NOW()`,
        [productId, productData.averageRating, productId]
      )
    }

    return await getProductByIdMySQL(productId)
  } catch (err) {
    logger.error("MySQL: updateProduct error", err, { productId })
    throw err
  }
}

export async function deleteProductMySQL(productId: number) {
  try {
    const result = await query("DELETE FROM products WHERE id = ?", [productId])
    return result.length > 0 ? { id: productId } : null
  } catch (err) {
    logger.error("MySQL: deleteProduct error", err, { productId })
    throw err
  }
}

export async function trackDownloadMySQL(downloadData: {
  userId: number
  productId: number
  ipAddress?: string
  userAgent?: string
}) {
  try {
    return await withTransaction(async (conn) => {
      // ✅ FIX: Kiểm tra user đã mua sản phẩm chưa
      const [purchaseRows]: any = await conn.execute(
        'SELECT id FROM purchases WHERE user_id = ? AND product_id = ?',
        [downloadData.userId, downloadData.productId]
      )
      
      if (!purchaseRows || purchaseRows.length === 0) {
        throw new Error('Bạn cần mua sản phẩm trước khi tải xuống')
      }
      
      // ✅ FIX: Lock product để tránh concurrent updates
      const [productRows]: any = await conn.execute(
        'SELECT id FROM products WHERE id = ? FOR UPDATE',
        [downloadData.productId]
      )
      
      if (!productRows || productRows.length === 0) {
        throw new Error('Product not found')
      }
      
      // ✅ FIX: Check existing download với lock để tránh race condition
      const [existingRows]: any = await conn.execute(
        `SELECT id, downloaded_at FROM downloads 
         WHERE user_id = ? AND product_id = ? 
         AND DATE(downloaded_at) = DATE(NOW())
         FOR UPDATE`,
        [downloadData.userId, downloadData.productId]
      )
      
      let isNewDownload = !existingRows || existingRows.length === 0
      let downloadId: number
      let downloadedAt: Date
      
      if (isNewDownload) {
        // ✅ FIX: Insert mới và tăng download_count atomically
        const [insertResult]: any = await conn.execute(
          `INSERT INTO downloads (user_id, product_id, ip_address, user_agent, downloaded_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [
            downloadData.userId,
            downloadData.productId,
            downloadData.ipAddress || null,
            downloadData.userAgent || null,
          ]
        )
        
        downloadId = insertResult.insertId
        
        // ✅ FIX: Tăng download_count atomically
        await conn.execute(
          'UPDATE products SET download_count = COALESCE(download_count, 0) + 1, updated_at = NOW() WHERE id = ?',
          [downloadData.productId]
        )
        
        // Get downloaded_at
        const [downloadRow]: any = await conn.execute(
          'SELECT downloaded_at FROM downloads WHERE id = ?',
          [downloadId]
        )
        downloadedAt = downloadRow[0]?.downloaded_at || new Date()
      } else {
        // Update timestamp của download hiện tại
        downloadId = existingRows[0].id
        await conn.execute(
          `UPDATE downloads 
           SET downloaded_at = NOW(),
               ip_address = ?,
               user_agent = ?
           WHERE id = ?`,
          [
            downloadData.ipAddress || null,
            downloadData.userAgent || null,
            downloadId,
          ]
        )
        
        const [downloadRow]: any = await conn.execute(
          'SELECT downloaded_at FROM downloads WHERE id = ?',
          [downloadId]
        )
        downloadedAt = downloadRow[0]?.downloaded_at || new Date()
      }
      
      // Get product để trả về download_url
      const [productRows2]: any = await conn.execute(
        'SELECT download_url, file_url FROM products WHERE id = ?',
        [downloadData.productId]
      )
      
      return {
        id: downloadId,
        downloadedAt,
        downloadUrl: productRows2[0]?.download_url || productRows2[0]?.file_url || null,
      }
    })
  } catch (err) {
    logger.error("MySQL: trackDownload error", err, { downloadData })
    throw err
  }
}

// ===================== NOTIFICATIONS =====================

export async function createNotificationMySQL(notificationData: {
  userId: number
  type: string
  message: string
  isRead?: boolean
}) {
  try {
    const [result]: any = await getPool().execute(
      "INSERT INTO notifications (user_id, type, message, is_read, created_at) VALUES (?, ?, ?, ?, NOW())",
      [notificationData.userId, notificationData.type, notificationData.message, notificationData.isRead || false]
    )

    const row = await queryOne<any>("SELECT id, created_at FROM notifications WHERE id = ?", [
      result.insertId,
    ])

    return {
      id: row.id,
      createdAt: row.created_at,
    }
  } catch (err) {
    logger.error("MySQL: createNotification error", err, { notificationData })
    throw err
  }
}

export async function getNotificationsMySQL(userId?: number, isRead?: boolean) {
  try {
    let sql = "SELECT * FROM notifications WHERE 1=1"
    const params: any[] = []

    if (userId) {
      sql += " AND user_id = ?"
      params.push(userId)
    }

    if (isRead !== undefined) {
      sql += " AND is_read = ?"
      params.push(isRead)
    }

    sql += " ORDER BY created_at DESC"

    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getNotifications error", err, { userId, isRead })
    throw err
  }
}

export async function markNotificationAsReadMySQL(notificationId: number, userId: number) {
  try {
    const result = await query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notificationId, userId]
    )
    return result.length > 0 ? { id: notificationId } : null
  } catch (err) {
    logger.error("MySQL: markNotificationAsRead error", err, { notificationId, userId })
    throw err
  }
}

// ===================== CHAT =====================

export async function getChatsMySQL(
  userId?: number,
  adminId?: number,
  limit?: number,
  offset?: number
) {
  try {
    let sql = `SELECT c.*, 
               u.username as user_name,
               u.email as user_email,
               u.avatar_url as user_avatar,
               COALESCE(a.username, 'Admin') as admin_name,
               COALESCE(a.email, '') as admin_email,
               CASE WHEN c.is_admin = 1 THEN 1 ELSE 0 END as is_admin
        FROM chats c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN users a ON c.admin_id = a.id
        WHERE 1=1`
    const params: any[] = []

    if (userId) {
      sql += " AND c.user_id = ?"
      params.push(userId)
    }

    if (adminId) {
      sql += " AND c.admin_id = ?"
      params.push(adminId)
    }

    sql += " ORDER BY c.created_at ASC"

    if (limit !== undefined) {
      sql += " LIMIT ?"
      params.push(limit)
    }

    if (offset !== undefined) {
      sql += " OFFSET ?"
      params.push(offset)
    }

    const rows = await query<any>(sql, params)

    return rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      admin_id: row.admin_id,
      message: row.message,
      is_admin: row.is_admin || false,
      created_at: row.created_at,
      createdAt: row.created_at,
      user_name: row.user_name,
      user_email: row.user_email,
      user_avatar: row.user_avatar,
      admin_name: row.admin_name,
      admin_email: row.admin_email,
    }))
  } catch (err) {
    logger.error("MySQL: getChats error", err, { userId, adminId })
    throw err
  }
}

export async function createChatMySQL(chatData: {
  userId: number
  adminId: number | null
  message: string
  isAdmin: boolean
}) {
  try {
    const [result]: any = await getPool().execute(
      "INSERT INTO chats (user_id, admin_id, message, is_admin, created_at) VALUES (?, ?, ?, ?, NOW())",
      [chatData.userId, chatData.adminId, chatData.message, chatData.isAdmin ? 1 : 0]
    )

    const row = await queryOne<any>("SELECT id, created_at FROM chats WHERE id = ?", [
      result.insertId,
    ])

    return {
      id: row.id,
      createdAt: row.created_at,
    }
  } catch (err) {
    logger.error("MySQL: createChat error", err, { chatData })
    throw err
  }
}

// ===================== REVIEWS =====================

export async function getReviewsMySQL(filters?: {
  productId?: number
  userId?: number
  limit?: number
  offset?: number
}) {
  try {
    let sql = `SELECT r.*, 
               u.username, 
               u.email,
               u.avatar_url,
               pr.title as product_title
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN products pr ON r.product_id = pr.id
        WHERE 1=1`
    const params: any[] = []

    if (filters?.productId) {
      sql += " AND r.product_id = ?"
      params.push(filters.productId)
    }

    if (filters?.userId) {
      sql += " AND r.user_id = ?"
      params.push(filters.userId)
    }

    sql += " ORDER BY r.created_at DESC"

    if (filters?.limit) {
      sql += " LIMIT ?"
      params.push(filters.limit)
    }

    if (filters?.offset) {
      sql += " OFFSET ?"
      params.push(filters.offset)
    }

    return await query<any>(sql, params)
  } catch (err) {
    logger.error("MySQL: getReviews error", err, { filters })
    throw err
  }
}

export async function getProductAverageRatingMySQL(productId: number) {
  try {
    const row = await queryOne<any>("SELECT * FROM product_ratings WHERE product_id = ?", [
      productId,
    ])

    if (row) {
      return {
        product_id: row.product_id,
        average_rating: parseFloat(row.average_rating || "0"),
        total_ratings: parseInt(row.total_ratings || "0"),
        updated_at: row.updated_at,
      }
    }

    return {
      product_id: productId,
      average_rating: 0,
      total_ratings: 0,
      updated_at: new Date(),
    }
  } catch (err) {
    logger.error("MySQL: getProductAverageRating error", err, { productId })
    throw err
  }
}

export async function createReviewMySQL(reviewData: {
  userId: number
  productId: number
  rating: number
  comment?: string | null
}) {
  try {
    await query(
      `INSERT INTO reviews (user_id, product_id, rating, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         comment = VALUES(comment),
         updated_at = NOW()`,
      [reviewData.userId, reviewData.productId, reviewData.rating, reviewData.comment || null]
    )

    const row = await queryOne<any>(
      "SELECT id, created_at, updated_at FROM reviews WHERE user_id = ? AND product_id = ?",
      [reviewData.userId, reviewData.productId]
    )

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (err) {
    logger.error("MySQL: createReview error", err, { reviewData })
    throw err
  }
}

// ===================== EXPORT ALIASES =====================

export {
  getUserProfileByUserIdMySQL as getUserProfileByUserId,
  getUserProfileByEmailMySQL as getUserProfileByEmail,
  upsertUserProfileMySQL as upsertUserProfile,
  saveUserTwoFactorSecretMySQL as saveUserTwoFactorSecret,
  disableUserTwoFactorMySQL as disableUserTwoFactor,
  deletePasswordResetTokensMySQL as deletePasswordResetTokens,
  createPasswordResetTokenRecordMySQL as createPasswordResetTokenRecord,
  findValidPasswordResetTokenMySQL as findValidPasswordResetToken,
  consumePasswordResetTokenMySQL as consumePasswordResetToken,
  updateUserPasswordHashMySQL as updateUserPasswordHash,
  updateProductMySQL as updateProduct,
  deleteProductMySQL as deleteProduct,
  trackDownloadMySQL as trackDownload,
  createNotificationMySQL as createNotification,
  getNotificationsMySQL as getNotifications,
  markNotificationAsReadMySQL as markNotificationAsRead,
  getChatsMySQL as getChats,
  createChatMySQL as createChat,
  getReviewsMySQL as getReviews,
  getProductAverageRatingMySQL as getProductAverageRating,
  createReviewMySQL as createReview,
}



