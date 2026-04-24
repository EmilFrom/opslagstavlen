import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

interface PatchCardBody {
  name?: string;
  description?: string;
  isArchived?: boolean;
}

function getCardIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const cardsIndex = parts.lastIndexOf("cards");

  if (cardsIndex < 0 || cardsIndex + 1 >= parts.length) {
    return "";
  }

  return parts[cardsIndex + 1] ?? "";
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = getCardIdFromPath(request.nextUrl.pathname);

  if (!cardId) {
    return NextResponse.json({ error: "Missing card id." }, { status: 400 });
  }

  let body: PatchCardBody;

  try {
    body = (await request.json()) as PatchCardBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payloadBody: Record<string, string | boolean> = {};

  if (typeof body.name === "string") {
    payloadBody.name = body.name;
  }

  if (typeof body.description === "string") {
    payloadBody.description = body.description;
  }

  if (typeof body.isArchived === "boolean") {
    payloadBody.isArchived = body.isArchived;
  }

  const plankaUrl = `${PLANKA_BASE_URL}/api/cards/${cardId}`;

  try {
    const response = await fetch(plankaUrl, {
      method: "PATCH",
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
    console.error("[api/cards/[cardId]]", error);
    return NextResponse.json(
      { error: "Could not update card right now." },
      { status: 500 },
    );
  }
}
