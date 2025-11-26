import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken, validateRequest } from '@/lib/api-auth';
import { pool, getUserIdByEmail } from '@/lib/database';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs'

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // ✅ FIX: Thêm rate limiting để tránh spam reviews
    const { checkRateLimitAndRespond } = await import('@/lib/rate-limit');
    const rateLimitResponse = await checkRateLimitAndRespond(request, 5, 60, 'review-post');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authUser = await verifyFirebaseToken(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate với Zod
    const validation = validateRequest(body, reviewSchema);
    
    if (!validation.valid || !validation.data) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Dữ liệu không hợp lệ'
      }, { status: 400 });
    }
    
    const { productId, rating, comment } = validation.data;
    
    // Get user_id từ email
    const userId = await getUserIdByEmail(authUser.email || '');
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User not found in database' }, { status: 404 });
    }
    
    // ✅ FIX: Enforce user phải mua sản phẩm trước khi review
    const purchaseCheck = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    if (purchaseCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Bạn cần mua sản phẩm trước khi đánh giá' 
      }, { status: 403 });
    }
    
    // Insert review (ON CONFLICT để update nếu đã có review)
    const result = await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET 
         rating = EXCLUDED.rating, 
         comment = EXCLUDED.comment, 
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, created_at, updated_at`,
      [userId, productId, rating, comment || null]
    );
    
    return NextResponse.json({
      success: true,
      review: {
        id: result.rows[0].id,
        userId,
        productId,
        rating,
        comment: comment || null,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error: any) {
    logger.error('Review POST error', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        error: 'Bạn đã đánh giá sản phẩm này rồi'
      }, { status: 400 });
    }
    
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // ✅ FIX: Thêm rate limiting
    const { checkRateLimitAndRespond } = await import('@/lib/rate-limit');
    const rateLimitResponse = await checkRateLimitAndRespond(request, 30, 10, 'review-get');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // ✅ FIX: Max limit 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0); // ✅ FIX: Min offset 0
    
    let query = `
      SELECT r.*, 
             u.username, 
             u.email,
             pr.title as product_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN products pr ON r.product_id = pr.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (productId) {
      query += ` AND r.product_id = $${paramIndex}`;
      params.push(parseInt(productId));
      paramIndex++;
      
      if (userId) {
        query += ` AND r.user_id = $${paramIndex}`;
        params.push(parseInt(userId));
        paramIndex++;
      }
    } else if (userId) {
      query += ` AND r.user_id = $${paramIndex}`;
      params.push(parseInt(userId));
      paramIndex++;
    }
    
    // ✅ FIX: Sửa lỗi paramIndex trùng lặp - fix đúng cách
    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit);
    params.push(offset);
    // paramIndex không cần tăng nữa vì đã dùng xong
    
    const result = await pool.query(query, params);
    
    // Get average rating nếu có productId
    let averageRating = null;
    if (productId) {
      // ✅ FIX: Dùng bảng product_ratings thay vì VIEW
      const avgResult = await pool.query(
        'SELECT * FROM product_ratings WHERE product_id = $1',
        [parseInt(productId)]
      );
      if (avgResult.rows.length > 0) {
        const rating = avgResult.rows[0];
        // Get min/max từ reviews table
        const minMaxResult = await pool.query(
          'SELECT MIN(rating) as min_rating, MAX(rating) as max_rating FROM reviews WHERE product_id = $1',
          [parseInt(productId)]
        );
        averageRating = {
          average: parseFloat(rating.average_rating || '0'),
          count: parseInt(rating.total_ratings || '0'),
          min: minMaxResult.rows[0]?.min_rating ? parseInt(minMaxResult.rows[0].min_rating) : 0,
          max: minMaxResult.rows[0]?.max_rating ? parseInt(minMaxResult.rows[0].max_rating) : 0
        };
      } else {
        // Nếu chưa có rating, trả về default
        averageRating = {
          average: 0,
          count: 0,
          min: 0,
          max: 0
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      reviews: result.rows,
      averageRating,
      pagination: {
        limit,
        offset,
        total: result.rows.length
      }
    });
  } catch (error: any) {
    logger.error('Review GET error', error, { url: request.url });
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
