import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";
const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

type SupportedUser = "emil" | "coline";

interface JwtPayload {
  username?: string;
  name?: string;
  sub?: string;
}

interface NotificationRequestBody {
  title?: string;
  message?: string;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf-8");

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function toSupportedUser(value?: string): SupportedUser | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "emil" || normalized.includes("emil")) {
    return "emil";
  }

  if (normalized === "coline" || normalized.includes("coline")) {
    return "coline";
  }

  return null;
}

async function resolveCurrentUser(token: string): Promise<SupportedUser | null> {
  const decoded = decodeJwtPayload(token);

  const fromToken =
    toSupportedUser(decoded?.username) ??
    toSupportedUser(decoded?.name) ??
    toSupportedUser(decoded?.sub);

  if (fromToken) {
    return fromToken;
  }

  try {
    const upstreamResponse = await fetch(`${PLANKA_BASE_URL}/api/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return null;
    }

    const rawText = await upstreamResponse.text();
    const data = rawText
      ? (JSON.parse(rawText) as {
          item?: {
            username?: string;
            name?: string;
          };
        })
      : null;

    return toSupportedUser(data?.item?.username) ?? toSupportedUser(data?.item?.name);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sender = await resolveCurrentUser(token);

  if (!sender) {
    return NextResponse.json(
      { error: "Kunne ikke bestemme den aktuelle bruger." },
      { status: 400 },
    );
  }

  const recipient = sender === "emil" ? "coline" : "emil";

  const appToken = process.env.PUSHOVER_APP_TOKEN;
  const recipientUserKey =
    recipient === "emil"
      ? process.env.PUSHOVER_USER_KEY_EMIL
      : process.env.PUSHOVER_USER_KEY_COLINE;

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
