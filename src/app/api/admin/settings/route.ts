import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = await prisma.appSetting.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined || value === null) {
    return NextResponse.json(
      { error: "Key and value are required." },
      { status: 400 }
    );
  }

  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: {
      value: String(value),
      updatedBy: session.user.id,
      updatedAt: new Date(),
    },
    create: {
      key,
      value: String(value),
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json(setting);
}
