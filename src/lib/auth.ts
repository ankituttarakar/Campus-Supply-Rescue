import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AuthSession, UserRole } from './types';
import { query } from './db/client';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'campus_supply_rescue_super_secret_jwt_key_2026_dbms_level3';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'csr_session_token';

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export async function createSessionToken(payload: AuthSession['user']): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSession['user'] | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSession['user'];
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const user = await verifySessionToken(token);
  if (!user) return null;

  return { user };
}

export async function setSessionCookie(user: AuthSession['user']) {
  const token = await createSessionToken(user);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Server-side guard verifying authenticated session and optional role requirement.
 * Throws or returns null if unauthorized.
 */
export async function requireAuth(requiredRole?: UserRole): Promise<AuthSession['user']> {
  const session = await getSession();
  if (!session || !session.user) {
    throw new Error('UNAUTHORIZED: Authentication required.');
  }

  if (requiredRole && session.user.role !== requiredRole && session.user.role !== 'ADMIN') {
    throw new Error(`FORBIDDEN: Insufficient permissions. Required role: ${requiredRole}`);
  }

  return session.user;
}
