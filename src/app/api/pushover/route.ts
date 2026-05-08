import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

type SupportedUser = "emil" | "coline";

interface NotificationRequestBody {
  title?: string;
  message?: string;
}

function toSupportedUser(value?: string): SupportedUser | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "emil") {
    return "emil";
  }

  if (normalized === "coline") {
    return "coline";
  }

  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);

  if (tokens.includes("emil")) {
    return "emil";
  }

  if (tokens.includes("coline")) {
    return "coline";
  }

  return null;
}

async function resolveCurrentUser(
  request: NextRequest,
  token: string,
): Promise<SupportedUser | null> {
  try {
    const meUrl = new URL("/api/me", request.nextUrl.origin);
    const meResponse = await fetch(meUrl, {
      method: "GET",
      headers: {
        Cookie: `planka_jwt=${token}`,
      },
      cache: "no-store",
    });

    if (!meResponse.ok) {
      return null;
    }

    const data = (await meResponse.json()) as { username?: string; name?: string };

    return toSupportedUser(data.username) ?? toSupportedUser(data.name);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sender = await resolveCurrentUser(request, token);

  if (!sender) {
    return NextResponse.json(
      { error: "Kunne ikke bestemme den aktuelle bruger." },
      { status: 400 },
    );
  }

  const recipient = sender === "emil" ? "coline" : "emil";

  const appToken = process.env.PUSHOVER_APP_TOKEN;
  const sharedUserKey = process.env.PUSHOVER_USER_KEY;
  const recipientUserKey =
    sharedUserKey ||
    (recipient === "emil"
      ? process.env.PUSHOVER_USER_KEY_EMIL
      : process.env.PUSHOVER_USER_KEY_COLINE);
  const recipientDevice =
    recipient === "emil"
      ? process.env.PUSHOVER_DEVICE_EMIL
      : process.env.PUSHOVER_DEVICE_COLINE;

  if (!appToken || !recipientUserKey) {
    return NextResponse.json(
      { error: "Pushover miljøvariabler mangler." },
      { status: 500 },
    );
  }

  let body: NotificationRequestBody = {};

  try {
    body = (await request.json()) as NotificationRequestBody;
  } catch {
    body = {};
  }

  const senderName = sender === "emil" ? "Emil" : "Coline";
  const message =
    body.message?.trim() || `${senderName} har sendt dig en notifikation fra Opslagstavlen.`;

  const formData = new URLSearchParams({
    token: appToken,
    user: recipientUserKey,
    message,
    title: body.title?.trim() || "Opslagstavlen",
  });

  if (recipientDevice?.trim()) {
    formData.set("device", recipientDevice.trim());
  }

  try {
    const pushoverResponse = await fetch(PUSHOVER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    const rawText = await pushoverResponse.text();

    if (!pushoverResponse.ok) {
      return NextResponse.json(
        { error: rawText || "Kunne ikke sende notifikation." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, recipient });
  } catch {
    return NextResponse.json(
      { error: "Netværksfejl ved afsendelse af notifikation." },
      { status: 502 },
    );
  }
}
