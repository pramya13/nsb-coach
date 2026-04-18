import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tests = await prisma.monthlyTest.findMany({
    orderBy: { testDate: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      enteredByUser: { select: { name: true } },
    },
  });

  return NextResponse.json(tests);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "COACH"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, testDate, score, total, notes } = body;

  if (!userId || !testDate || score === undefined || !total) {
    return NextResponse.json(
      { error: "userId, testDate, score, and total are required." },
      { status: 400 }
    );
  }

  const scoreNum = parseInt(score, 10);
  const totalNum = parseInt(total, 10);

  if (totalNum <= 0) {
    return NextResponse.json(
      { error: "Total must be greater than 0." },
      { status: 400 }
    );
  }

  const percentAccuracy = (scoreNum / totalNum) * 100;

  const test = await prisma.monthlyTest.create({
    data: {
      userId,
      testDate: new Date(testDate),
      score: scoreNum,
      total: totalNum,
      percentAccuracy,
      notes: notes || null,
      enteredBy: session.user.id,
    },
    include: {
      user: { select: { name: true, email: true } },
      enteredByUser: { select: { name: true } },
    },
  });

  return NextResponse.json(test, { status: 201 });
}
