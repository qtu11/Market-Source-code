import { pool } from './database';
import { logger } from './logger';

function sanitizeTsQuery(input: string) {
  return input
    .replace(/['":()&|!]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ');
}

// ============================================================
// WISHLIST FUNCTIONS
// ============================================================

export async function addToWishlist(userId: number, productId: number) {
  try {
    const result = await pool.query(
      `INSERT INTO wishlists (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING
       RETURNING id, created_at`,
      [userId, productId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error adding to wishlist:', error);
    throw error;
  }
}

export async function removeFromWishlist(userId: number, productId: number) {
  try {
    await pool.query(
      'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    return { success: true };
  } catch (error) {
    logger.error('Error removing from wishlist:', error);
    throw error;
  }
}

export async function getWishlist(userId: number) {
  try {
    // ✅ FIX: Dùng product_ratings thay vì query reviews trực tiếp để tối ưu performance
    const result = await pool.query(
      `SELECT w.*, p.*, 
              COALESCE(pr.average_rating, 0) as avg_rating,
              COALESCE(pr.total_ratings, 0) as review_count
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       LEFT JOIN product_ratings pr ON p.id = pr.product_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error getting wishlist:', error);
    throw error;
  }
}

export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking wishlist:', error);
    return false;
  }
}

// ============================================================
// PRODUCT SEARCH (Full-Text Search)
// ============================================================

export async function searchProducts(query: string, filters?: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  limit?: number;
  offset?: number;
}) {
  try {
    // ✅ FIX: Check xem có search_vector column không, nếu không thì dùng LIKE search
    const checkColumnResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'search_vector'
    `);
    
    const hasSearchVector = checkColumnResult.rows.length > 0;
    
    let sql: string;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (hasSearchVector) {
      const tsQuery = sanitizeTsQuery(query) || query.replace(/\s+/g, ' & ');

      // Use full-text search với search_vector
      sql = `
        SELECT p.*,
               pr.average_rating as avg_rating,
               pr.total_ratings as review_count,
               ts_rank(p.search_vector, to_tsquery('english', $${paramIndex})) as rank
        FROM products p
        LEFT JOIN product_ratings pr ON p.id = pr.product_id
        WHERE p.search_vector @@ to_tsquery('english', $${paramIndex})
          AND p.is_active = true
      `;
      params.push(tsQuery);
      paramIndex++;
    } else {
      // ✅ FIX: Fallback to LIKE search nếu không có search_vector
      sql = `
        SELECT p.*,
               pr.average_rating as avg_rating,
               pr.total_ratings as review_count,
               1 as rank
        FROM products p
        LEFT JOIN product_ratings pr ON p.id = pr.product_id
        WHERE p.is_active = true
          AND (
            p.title ILIKE $${paramIndex}
            OR p.description ILIKE $${paramIndex}
            OR EXISTS (
              SELECT 1 FROM unnest(p.tags) tag 
              WHERE tag ILIKE $${paramIndex}
            )
          )
      `;
      params.push(`%${query}%`);
      paramIndex++;
    }
    
    if (filters?.category) {
      sql += ` AND p.category = $${paramIndex}`;
      params.push(filters.category);
      paramIndex++;
    }
    
    if (filters?.minPrice !== undefined) {
      sql += ` AND p.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }
    
    if (filters?.maxPrice !== undefined) {
      sql += ` AND p.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }
    
    if (filters?.minRating !== undefined) {
      // ✅ FIX: Dùng product_ratings thay vì query reviews trực tiếp
      sql += ` AND (pr.average_rating >= $${paramIndex} OR pr.average_rating IS NULL)`;
      params.push(filters.minRating);
      paramIndex++;
    }
    
    // ✅ FIX: Order by rank nếu có, nếu không thì order by created_at
    if (hasSearchVector) {
      sql += ` ORDER BY rank DESC, p.created_at DESC`;
    } else {
      sql += ` ORDER BY 
        CASE 
          WHEN p.title ILIKE $${paramIndex - 1} THEN 1
          WHEN p.description ILIKE $${paramIndex - 1} THEN 2
          ELSE 3
        END,
        p.created_at DESC`;
    }
    
    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    
    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }
    
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('Error searching products:', error);
    throw error;
  }
}

// ============================================================
// ANALYTICS FUNCTIONS
// ============================================================

export async function trackEvent(eventType: string, eventData: any, userId?: number, ipAddress?: string, userAgent?: string) {
  try {
    await pool.query(
      `INSERT INTO analytics_events (user_id, event_type, event_data, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, eventType, JSON.stringify(eventData), ipAddress || null, userAgent || null]
    );
  } catch (error) {
    logger.error('Error tracking event:', error);
    // Don't throw - analytics should not break the app
  }
}

export async function trackProductView(productId: number, userId?: number, ipAddress?: string) {
  try {
    await pool.query(
      `INSERT INTO product_views (product_id, user_id, ip_address)
       VALUES ($1, $2, $3)`,
      [productId, userId || null, ipAddress || null]
    );
  } catch (error) {
    logger.error('Error tracking product view:', error);
  }
}

export async function getProductViews(productId: number, days: number = 30) {
  try {
    // ✅ FIX: Thêm parameterized query để tránh SQL injection
    const result = await pool.query(
      `SELECT COUNT(*) as total_views,
              COUNT(DISTINCT user_id) as unique_views
       FROM product_views
       WHERE product_id = $1
         AND viewed_at >= NOW() - INTERVAL '1 day' * $2`,
      [productId, days]
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error getting product views:', error);
    throw error;
  }
}

// ============================================================
// BUNDLE FUNCTIONS
// ============================================================

export async function getBundles(isActive?: boolean) {
  try {
    let query = `
      SELECT b.*,
             COUNT(bp.product_id) as product_count
      FROM bundles b
      LEFT JOIN bundle_products bp ON b.id = bp.bundle_id
    `;
    const params: any[] = [];
    
    if (isActive !== undefined) {
      query += ' WHERE b.is_active = $1';
      params.push(isActive);
    }
    
    query += ' GROUP BY b.id ORDER BY b.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    logger.error('Error getting bundles:', error);
    throw error;
  }
}

export async function getBundleWithProducts(bundleId: number) {
  try {
    const bundleResult = await pool.query(
      'SELECT * FROM bundles WHERE id = $1',
      [bundleId]
    );
    
    if (bundleResult.rows.length === 0) {
      return null;
    }
    
    const productsResult = await pool.query(
      `SELECT p.*
       FROM products p
       JOIN bundle_products bp ON p.id = bp.product_id
       WHERE bp.bundle_id = $1`,
      [bundleId]
    );
    
    return {
      ...bundleResult.rows[0],
      products: productsResult.rows,
    };
  } catch (error) {
    logger.error('Error getting bundle with products:', error);
    throw error;
  }
}

// ============================================================
// REVIEW VOTES FUNCTIONS
// ============================================================

export async function voteReview(reviewId: number, userId: number, isHelpful: boolean) {
  try {
    const result = await pool.query(
      `INSERT INTO review_votes (review_id, user_id, is_helpful)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, user_id)
       DO UPDATE SET is_helpful = EXCLUDED.is_helpful
       RETURNING id`,
      [reviewId, userId, isHelpful]
    );
    
    // Update helpful_count
    await pool.query(
      `UPDATE reviews 
       SET helpful_count = (
         SELECT COUNT(*) FROM review_votes 
         WHERE review_id = $1 AND is_helpful = true
       )
       WHERE id = $1`,
      [reviewId]
    );
    
    return result.rows[0];
  } catch (error) {
    logger.error('Error voting review:', error);
    throw error;
  }
}

// ============================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================

export async function getUserSubscription(userId: number) {
  try {
    const result = await pool.query(
      `SELECT s.*, sb.*
       FROM subscriptions s
       LEFT JOIN subscription_benefits sb ON s.plan = sb.plan
       WHERE s.user_id = $1 AND s.status = 'active'
       ORDER BY s.start_date DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting user subscription:', error);
    throw error;
  }
}

export async function getSubscriptionDiscount(userId: number): Promise<number> {
  try {
    const subscription = await getUserSubscription(userId);
    return subscription?.discount_percent || 0;
  } catch (error) {
    return 0;
  }
}

