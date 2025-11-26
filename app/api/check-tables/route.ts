export const runtime = 'nodejs'

// /app/api/check-tables/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Đồng bộ cấu hình SSL với lib/database.ts
    ssl: process.env.DB_SSL === 'disable'
      ? undefined
      : {
          rejectUnauthorized: false,
        },
  });

  try {
    const client = await pool.connect();

    // Kiểm tra bảng users (PostgreSQL syntax)
    const usersTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    const usersExists = usersTableResult.rows[0].exists;

    // Kiểm tra bảng notifications
    const notificationsTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);
    const notificationsExists = notificationsTableResult.rows[0].exists;

    let result = {
      users: { exists: usersExists, structure: null as any },
      notifications: { exists: notificationsExists, structure: null as any },
    };

    if (usersExists) {
      const usersColumnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position;
      `);
      result.users.structure = usersColumnsResult.rows;
    } else {
      // Không tự động tạo bảng - dùng create-tables.sql thay vì
      result.users.exists = false;
      result.users.structure = null;
    }

    if (notificationsExists) {
      const notificationsColumnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notifications'
        ORDER BY ordinal_position;
      `);
      result.notifications.structure = notificationsColumnsResult.rows;
    } else {
      result.notifications.exists = false;
      result.notifications.structure = null;
    }

    client.release();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
