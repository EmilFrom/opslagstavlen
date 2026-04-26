import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

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

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const plankaUrl = `${PLANKA_BASE_URL}/api/cards/${cardId}`;

  console.log("[PROXY OUTGOING] PATCH", plankaUrl, payload);

  try {
    const response = await fetch(plankaUrl, {
      method: "PATCH",
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
    console.error("[api/cards/[cardId]]", error);
    return NextResponse.json(
      { error: "Could not update card right now." },
      { status: 500 },
    );
  }
}
