import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { gradeLevel } = body as { gradeLevel?: string };

  if (gradeLevel !== "MS" && gradeLevel !== "HS") {
    return NextResponse.json(
      { error: "gradeLevel must be 'MS' or 'HS'." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "STUDENT") {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { gradeLevel },
    select: { id: true, name: true, email: true, gradeLevel: true },
  });

  return NextResponse.json(updated);
}
