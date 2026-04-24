import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

function getBoardIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const cardsIndex = parts.lastIndexOf("cards");

  if (cardsIndex < 1) {
    return "";
  }

  return parts[cardsIndex - 1] ?? "";
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boardId = getBoardIdFromPath(request.nextUrl.pathname);

  if (!boardId) {
    return NextResponse.json({ error: "Missing board id." }, { status: 400 });
  }

  try {
    const upstreamUrl = `${PLANKA_BASE_URL}/api/boards/${boardId}`;

    const upstreamResponse = await fetch(
      upstreamUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return new NextResponse(rawText, {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    try {
      const data = rawText ? (JSON.parse(rawText) as unknown) : null;

      const included =
        data &&
        typeof data === "object" &&
        "included" in data &&
        data.included &&
        typeof data.included === "object"
          ? data.included
          : null;

      const lists = included && "lists" in included && Array.isArray(included.lists)
        ? included.lists
        : [];

      const cards = included && "cards" in included && Array.isArray(included.cards)
        ? included.cards
        : [];

      const labels = included && "labels" in included && Array.isArray(included.labels)
        ? included.labels
        : [];

      const cardLabels =
        included && "cardLabels" in included && Array.isArray(included.cardLabels)
          ? included.cardLabels
          : [];

      return NextResponse.json({ lists, cards, labels, cardLabels }, { status: 200 });
    } catch {
      return new NextResponse(rawText, {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  } catch (error) {
    return new NextResponse(String(error), {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
