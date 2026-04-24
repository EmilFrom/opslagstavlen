import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

interface AttachLabelBody {
  labelId?: string;
}

interface AttemptConfig {
  url: string;
  method: "POST";
  payload: Record<string, string> | null;
}

function getCardIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const labelsIndex = parts.lastIndexOf("labels");

  if (labelsIndex < 1) {
    return "";
  }

  return parts[labelsIndex - 1] ?? "";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = getCardIdFromPath(request.nextUrl.pathname);

  if (!cardId) {
    return NextResponse.json({ error: "Missing card id." }, { status: 400 });
  }

  let body: AttachLabelBody;

  try {
    body = (await request.json()) as AttachLabelBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.labelId) {
    return NextResponse.json({ error: "Missing labelId." }, { status: 400 });
  }

  const payloadBody = { labelId: body.labelId };
  const attempts: AttemptConfig[] = [
    {
      url: `${PLANKA_BASE_URL}/api/cards/${cardId}/card-labels`,
      method: "POST",
      payload: { labelId: body.labelId },
    },
    {
      url: `${PLANKA_BASE_URL}/api/cards/${cardId}/labels`,
      method: "POST",
      payload: { labelId: body.labelId },
    },
    {
      url: `${PLANKA_BASE_URL}/api/cards/${cardId}/labels/${body.labelId}`,
      method: "POST",
      payload: null,
    },
    {
      url: `${PLANKA_BASE_URL}/api/card-labels`,
      method: "POST",
      payload: { cardId, labelId: body.labelId },
    },
  ];

  try {
    let lastStatus = 500;
    let lastRawText = "Could not attach label right now.";

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: attempt.payload ? JSON.stringify(attempt.payload) : undefined,
        cache: "no-store",
      });

      const status = response.status;
      const rawText = await response.text();

      if (response.ok) {
        try {
          return NextResponse.json(rawText ? JSON.parse(rawText) : {});
        } catch {
          return NextResponse.json({ raw: rawText });
        }
      }

      lastStatus = status;
      lastRawText = rawText;

      // If route is not found, try next known Planka variant.
      if (status === 404) {
        continue;
      }

      return NextResponse.json({ error: rawText }, { status });
    }

    return NextResponse.json({ error: lastRawText }, { status: lastStatus });
  } catch (error) {
    console.error("[api/cards/[cardId]/labels]", error);
    return NextResponse.json(
      { error: "Could not attach label right now." },
      { status: 500 },
    );
  }
}
