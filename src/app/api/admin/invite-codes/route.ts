import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true, email: true } },
      usedUser: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(codes);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { targetRole, expiresAt } = body;

  if (!targetRole || !["COACH", "STUDENT"].includes(targetRole)) {
    return NextResponse.json(
      { error: "Invalid role. Must be COACH or STUDENT." },
      { status: 400 }
    );
  }

  const code = uuidv4().replace(/-/g, "").slice(0, 12).toUpperCase();

  const inviteCode = await prisma.inviteCode.create({
    data: {
      code,
      targetRole,
      createdBy: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: {
      creator: { select: { name: true, email: true } },
      usedUser: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(inviteCode, { status: 201 });
}
