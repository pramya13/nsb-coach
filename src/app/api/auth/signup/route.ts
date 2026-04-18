import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, inviteCode } = body as {
      name?: string;
      email?: string;
      password?: string;
      inviteCode?: string;
    };

    // Validate required fields
    if (!name || !email || !password || !inviteCode) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    // Look up invite code
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite code." },
        { status: 400 }
      );
    }

    if (invite.usedBy) {
      return NextResponse.json(
        { error: "This invite code has already been used." },
        { status: 400 }
      );
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invite code has expired." },
        { status: 400 }
      );
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with role from invite code
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: invite.targetRole,
      },
    });

    // Mark invite code as used
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedBy: user.id },
    });

    return NextResponse.json(
      { success: true, message: "Account created successfully! Please sign in." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
