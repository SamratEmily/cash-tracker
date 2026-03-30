import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { description, amount, category } = await req.json();

  if (!description || !amount || !category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      description,
      amount: parseFloat(amount),
      category,
      userId,
    },
  });

  return NextResponse.json(transaction);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { id, description, amount, category } = await req.json();

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      description,
      amount: parseFloat(amount),
      category,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  const existing = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.transaction.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
