export const runtime = 'nodejs'

// /app/api/check-deposits-schema/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    // Kiểm tra schema của bảng deposits
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'deposits'
      ORDER BY ordinal_position;
    `);
    
    return NextResponse.json({
      success: true,
      columns: columnsResult.rows,
      columnNames: columnsResult.rows.map((r: any) => r.column_name),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
