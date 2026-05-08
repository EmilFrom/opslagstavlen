import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";
const UPLOAD_FIELD_NAMES = ["file", "image", "attachment"] as const;

function getCardIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const attachmentsIndex = parts.lastIndexOf("attachments");

  if (attachmentsIndex < 1) {
    return "";
  }

  return parts[attachmentsIndex - 1] ?? "";
}

function parseAttachmentsFromRaw(rawText: string) {
  try {
    const parsed = rawText ? (JSON.parse(rawText) as unknown) : null;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object" && "items" in parsed && Array.isArray(parsed.items)) {
      return parsed.items;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "included" in parsed &&
      parsed.included &&
      typeof parsed.included === "object" &&
      "attachments" in parsed.included &&
      Array.isArray(parsed.included.attachments)
    ) {
      return parsed.included.attachments;
    }
  } catch {
    // no-op
  }

  return [];
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = getCardIdFromPath(request.nextUrl.pathname);

  if (!cardId) {
    return NextResponse.json({ error: "Missing card id." }, { status: 400 });
  }

  const endpoints = [
    `${PLANKA_BASE_URL}/api/cards/${cardId}/attachments`,
    `${PLANKA_BASE_URL}/api/cards/${cardId}`,
  ];

  try {
    let lastError = "Kunne ikke hente vedhæftninger";
    let lastStatus = 502;

    for (const endpoint of endpoints) {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const rawText = await response.text();

      if (response.ok) {
        return NextResponse.json({ items: parseAttachmentsFromRaw(rawText) });
      }

      lastError = rawText || lastError;
      lastStatus = response.status;

      if (response.status === 404) {
        continue;
      }

      return NextResponse.json({ error: lastError }, { status: lastStatus });
    }

    return NextResponse.json({ error: lastError }, { status: lastStatus });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke hente vedhæftninger lige nu." },
      { status: 500 },
    );
  }
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

  let file: File | null = null;

  try {
    const formData = await request.formData();
    const selected = formData.get("file");

    if (selected instanceof File) {
      file = selected;
    }
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  }

  const endpoint = `${PLANKA_BASE_URL}/api/cards/${cardId}/attachments`;

  try {
    let lastError = "Kunne ikke uploade billede";
    let lastStatus = 502;

    for (const fileFieldName of UPLOAD_FIELD_NAMES) {
      const uploadData = new FormData();
      uploadData.append(fileFieldName, file, file.name);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
        cache: "no-store",
      });

      const rawText = await response.text();

      if (response.ok) {
        const items = parseAttachmentsFromRaw(rawText);
        const first = items[0];

        return NextResponse.json({
          ok: true,
          item: first && typeof first === "object" ? first : null,
        });
      }

      lastError = rawText || lastError;
      lastStatus = response.status;

      if (response.status === 404 || response.status === 400 || response.status === 422) {
        continue;
      }

      return NextResponse.json({ error: lastError }, { status: lastStatus });
    }

    return NextResponse.json({ error: lastError }, { status: lastStatus });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke uploade billede lige nu." },
      { status: 500 },
    );
  }
}
