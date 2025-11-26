import { revalidateTag } from "next/cache"
import { pool } from "@/lib/database"
import type { QueryResult } from "pg"

type PurchaseRow = {
  id: string
  user_uid: string
  product_id: string
  product_title: string
  amount: number
  status: string
  created_at: string
}

export async function getUserPurchases(uid: string, limit = 50): Promise<PurchaseRow[]> {
  if (!uid) return []

  const result: QueryResult<PurchaseRow> = await pool.query(
    `SELECT id, user_uid, product_id, product_title, amount, status, created_at
     FROM purchases
     WHERE user_uid = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [uid, limit],
  )

  return result.rows
}

export async function revalidateUserPurchases(uid: string) {
  if (!uid) return
  revalidateTag(`orders:user:${uid}`)
}

