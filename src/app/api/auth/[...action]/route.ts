import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/client';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { action: string[] } }) {
  const action = params.action?.[0];

  try {
    if (action === 'login') {
      const { email, password } = await req.json();

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
      }

      const res = await query(
        `SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_active,
                d.id AS department_id, d.name AS department_name, d.code AS department_code
         FROM users u
         JOIN departments d ON u.department_id = d.id
         WHERE LOWER(u.email) = LOWER($1);`,
        [email]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      const userRow = res.rows[0];

      if (!userRow.is_active) {
        return NextResponse.json({ error: 'Account has been deactivated. Please contact campus admin.' }, { status: 403 });
      }

      const isMatch = await verifyPassword(password, userRow.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }

      const userPayload = {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        role: userRow.role,
        department_id: userRow.department_id,
        department_name: userRow.department_name,
        department_code: userRow.department_code,
      };

      await setSessionCookie(userPayload);

      return NextResponse.json({
        success: true,
        user: userPayload,
        message: `Welcome back, ${userRow.full_name}!`,
      });
    }

    if (action === 'demo-login') {
      const { email } = await req.json();

      const res = await query(
        `SELECT u.id, u.email, u.full_name, u.role, u.is_active,
                d.id AS department_id, d.name AS department_name, d.code AS department_code
         FROM users u
         JOIN departments d ON u.department_id = d.id
         WHERE LOWER(u.email) = LOWER($1);`,
        [email]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Demo user not found.' }, { status: 404 });
      }

      const userRow = res.rows[0];
      const userPayload = {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        role: userRow.role,
        department_id: userRow.department_id,
        department_name: userRow.department_name,
        department_code: userRow.department_code,
      };

      await setSessionCookie(userPayload);

      return NextResponse.json({
        success: true,
        user: userPayload,
        message: `Logged in as demo user: ${userRow.full_name}`,
      });
    }

    if (action === 'register') {
      const { full_name, email, password, department_id, phone } = await req.json();

      if (!full_name || !email || !password || !department_id) {
        return NextResponse.json({ error: 'Full name, email, password, and department are required.' }, { status: 400 });
      }

      // Check if email exists
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1);', [email]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 409 });
      }

      // Check department exists
      const deptCheck = await query('SELECT id, name, code FROM departments WHERE id = $1;', [department_id]);
      if (deptCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Selected department does not exist.' }, { status: 400 });
      }

      const password_hash = await hashPassword(password);

      // New registrations are assigned DEPARTMENT_STAFF role (ADMIN cannot be self-registered)
      const res = await query(
        `INSERT INTO users (department_id, full_name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, $4, 'DEPARTMENT_STAFF', $5)
         RETURNING id, email, full_name, role;`,
        [department_id, full_name, email.toLowerCase(), password_hash, phone || null]
      );

      const newUser = res.rows[0];
      const dept = deptCheck.rows[0];

      const userPayload = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        department_id: dept.id,
        department_name: dept.name,
        department_code: dept.code,
      };

      await setSessionCookie(userPayload);

      return NextResponse.json({
        success: true,
        user: userPayload,
        message: 'Account successfully registered and logged in.',
      }, { status: 201 });
    }

    if (action === 'logout') {
      await clearSessionCookie();
      return NextResponse.json({ success: true, message: 'Logged out successfully.' });
    }

    return NextResponse.json({ error: 'Invalid authentication endpoint.' }, { status: 404 });
  } catch (error: any) {
    console.error('[Auth API Error]', error);
    return NextResponse.json({ error: error?.message || 'Authentication processing error.' }, { status: 500 });
  }
}
