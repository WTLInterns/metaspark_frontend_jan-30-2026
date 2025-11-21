import { NextResponse } from 'next/server';

const users = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Admin User', role: 'Admin', department: 'Admin' },
  { id: 2, username: 'dana', password: 'dana123', name: 'Dana Scully', role: 'Designer', department: 'Design' },
  { id: 3, username: 'peter', password: 'peter123', name: 'Peter Parker', role: 'Production', department: 'Production' },
  { id: 4, username: 'tony', password: 'tony123', name: 'Tony Stark', role: 'Machinist', department: 'Machining' },
  { id: 5, username: 'walter', password: 'walter123', name: 'Walter White', role: 'Inspector', department: 'Inspection' },
  { id: 6, username: 'fox', password: 'fox123', name: 'Fox Mulder', role: 'Designer', department: 'Design' },
];

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    // Find user by username and password
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Remove password before sending user data
    const { password: _, ...userWithoutPassword } = user;
    
    // Create a response with the user data
    const response = NextResponse.json({
      success: true,
      user: userWithoutPassword
    });
    
    // Set an HTTP-only cookie with the user ID
    response.cookies.set('swiftflow-auth', JSON.stringify(userWithoutPassword), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
