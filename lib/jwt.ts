import { SignJWT, jwtVerify } from 'jose';

// JWT_SECRET must be set in environment variables
const secretKey = process.env.JWT_SECRET;
if (!secretKey || secretKey === 'default-secret-key-change-in-production') {
  throw new Error(
    'JWT_SECRET is not set or using default value. Please set JWT_SECRET in environment variables.'
  );
}
const secret = new TextEncoder().encode(secretKey);

/**
 * Tạo admin JWT token
 */
export async function createAdminToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

/**
 * Verify admin JWT token
 */
export async function verifyAdminToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    return null;
  }
}

