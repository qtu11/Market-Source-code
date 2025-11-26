import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/database';
import { verifyFirebaseToken, requireAdmin, validateRequest } from '@/lib/api-auth';
import { checkRateLimitAndRespond } from '@/lib/rate-limit';
import { productSchema } from '@/lib/validation-schemas';
import { sanitizeError, createErrorResponse, logError } from '@/lib/error-handler';

export const runtime = 'nodejs'

/**
 * GET /api/products
 * Lấy danh sách products
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimitAndRespond(request, 30, 10, 'products-get');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const filters: {
      category?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    } = {};

    if (category) {
      filters.category = category;
    }

    if (isActive !== null) {
      filters.isActive = isActive === 'true';
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        filters.limit = Math.min(limitNum, 100); // Max 100
      }
    }

    if (offset) {
      const offsetNum = parseInt(offset);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        filters.offset = offsetNum;
      }
    }

    const products = await getProducts(filters);

    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0,
    });
  } catch (error: unknown) {
    logError('Products GET', error);
    
    // ✅ FIX: Check if it's a database connection error
    if (error instanceof Error) {
      // Database connection errors
      if (error.message?.includes('ENOTFOUND') || 
          error.message?.includes('getaddrinfo') ||
          error.message?.includes('Database connection failed') ||
          error.message?.includes('Pool instance is null')) {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed. Please check environment variables.',
          details: (process.env.NETLIFY === 'true' || process.env.CONTEXT) 
            ? 'Database configuration missing on Netlify. Please set DATABASE_URL or NETLIFY_DATABASE_URL in Netlify dashboard.' 
            : error.message,
          products: [],
          count: 0
        }, { status: 503 }); // Service Unavailable
      }
      
      // SQL syntax errors
      if (error.message?.includes('syntax error') || 
          error.message?.includes('column') && error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Database query error. Please check database schema.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          products: [],
          count: 0
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      products: [],
      count: 0
    }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Tạo product mới (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimitAndRespond(request, 10, 60, 'products-post');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Require admin
    await requireAdmin(request);

    const body = await request.json();

    // Validate với Zod
    const validation = validateRequest(body, productSchema);

    if (!validation.valid || !validation.data) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Dữ liệu không hợp lệ'
      }, { status: 400 });
    }

    const productData = validation.data;

    // Create product
    const result = await createProduct({
      title: productData.title,
      description: productData.description,
      price: productData.price,
      category: productData.category,
      demoUrl: productData.demoUrl,
      downloadUrl: productData.downloadUrl,
      imageUrl: productData.imageUrl,
      tags: productData.tags,
      isActive: productData.isActive,
    });

    // Get created product để trả về đầy đủ
    const { getProductById } = await import('@/lib/database');
    const product = await getProductById(result.id);

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product,
    });
  } catch (error: unknown) {
    logError('Products POST', error);

    // Check for authentication errors
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        createErrorResponse(error, 401),
        { status: 401 }
      );
    }

    return NextResponse.json(
      createErrorResponse(error, 500),
      { status: 500 }
    );
  }
}
