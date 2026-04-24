import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

interface CreateCardBody {
  boardId?: string;
  listId?: string;
  name?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateCardBody;

  try {
    body = (await request.json()) as CreateCardBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.boardId || !body.listId || !body.name) {
    return NextResponse.json(
      { error: "Missing required fields: boardId, listId, name." },
      { status: 400 },
    );
  }

  const payloadBody: Record<string, string> = {
    listId: body.listId,
    name: body.name,
  };

  if (body.description && body.description.trim() !== "") {
    payloadBody.description = body.description;
  }

  const plankaUrl = `${PLANKA_BASE_URL}/api/cards`;

  try {
    const response = await fetch(plankaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadBody),
      cache: "no-store",
    });

    const status = response.status;
    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json({ error: rawText }, { status });
    }

    try {
      return NextResponse.json(rawText ? JSON.parse(rawText) : {});
    } catch {
      return NextResponse.json({ raw: rawText });
    }
  } catch (error) {
    console.error("[api/cards]", error);
    return NextResponse.json(
      { error: "Could not create card right now." },
      { status: 500 },
    );
  }
}
