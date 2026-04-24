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

  const payload: Record<string, string | number> = {
    name: body.name,
    position: 65536,
    type: "project",
  };

  if (body.description && body.description.trim() !== "") {
    payload.description = body.description;
  }

  if (body.boardId) {
    payload.boardId = body.boardId;
  }

  const upstreamUrl = `${PLANKA_BASE_URL}/api/lists/${body.listId}/cards`;

  console.log("[PROXY OUTGOING] POST", upstreamUrl, payload);

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const rawText = await response.text();

    console.log("[PROXY INCOMING] Status:", response.status, rawText);

    if (!response.ok) {
      return new NextResponse(rawText, {
        status: response.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
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
