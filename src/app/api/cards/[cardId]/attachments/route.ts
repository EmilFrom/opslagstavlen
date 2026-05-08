import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";
const UPLOAD_FIELD_NAMES = ["file", "image", "attachment"] as const;
const ATTACHMENT_TYPE = "file";
const ATTACHMENT_FALLBACK_NAME = "Vedhæftet fil";

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
    const parsed = rawText ? (JSON.parse(rawText) as any) : null;

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === "object") {
      // Version 1: { items: [...] }
      if ("items" in parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }
      
      // Version 2: { item: { attachments: [...] } }
      if ("item" in parsed && parsed.item && typeof parsed.item === "object" && "attachments" in parsed.item && Array.isArray(parsed.item.attachments)) {
         return parsed.item.attachments;
      }

      // Version 3: { included: { attachments: [...] } }
      if (
        "included" in parsed &&
        parsed.included &&
        typeof parsed.included === "object" &&
        "attachments" in parsed.included &&
        Array.isArray(parsed.included.attachments)
      ) {
        return parsed.included.attachments;
      }
    }
  } catch (error) {
    console.error("[PROXY] Failed to parse attachments JSON:", error);
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
    let allItems: any[] = [];

    for (const endpoint of endpoints) {
      console.log(`[PROXY] Fetching attachments from: ${endpoint}`);
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
        const items = parseAttachmentsFromRaw(rawText);
        if (Array.isArray(items) && items.length > 0) {
          return NextResponse.json({ items });
        }
        // If we got an OK response but items is empty, we continue to the next endpoint
      } else {
          lastError = rawText || lastError;
          lastStatus = response.status;
      }

      if (response.status === 404) {
        continue;
      }
    }

    // If we've tried all endpoints and still have no items, return empty list
    return NextResponse.json({ items: [] });
  } catch (error) {
    console.error("[PROXY] Global error in attachments GET:", error);
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
      const fileName = file.name || ATTACHMENT_FALLBACK_NAME;
      const uploadData = new FormData();
      uploadData.append("type", ATTACHMENT_TYPE);
      uploadData.append("name", fileName);
      uploadData.append(fileFieldName, file, fileName);

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
  } catch (error) {
    console.error("[PROXY] Global error in attachments POST:", error);
    return NextResponse.json(
      { error: "Kunne ikke uploade billede lige nu." },
      { status: 500 },
    );
  }
}
