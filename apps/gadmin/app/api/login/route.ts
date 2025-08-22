import { NextRequest, NextResponse } from 'next/server';

// Placeholder login: accepts any email/password and returns dummy token.
// Replace with real core API call.
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'EMAIL_PASSWORD_REQUIRED' }, { status: 400 });
  }
  // Dummy user & token (in real scenario call core API /auth/login)
  const token = 'dev_demo_token_' + Buffer.from(email).toString('base64');
  const res = NextResponse.json({ user: { id: 'u_demo', email }, token });
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60
  });
  return res;
}
