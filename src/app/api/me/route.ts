import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

interface JwtPayload {
  id?: string;
  userId?: string;
  name?: string;
  username?: string;
  sub?: string;
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

export async function GET(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return NextResponse.json({ error: "Could not decode token." }, { status: 400 });
  }

  const decodedUser = {
    id: payload.userId ?? payload.id ?? payload.sub ?? "",
    name: payload.name ?? payload.username ?? "",
    username: payload.username ?? "",
  };

  if (decodedUser.name && decodedUser.username) {
    return NextResponse.json(decodedUser);
  }

  try {
    const upstreamResponse = await fetch(`${PLANKA_BASE_URL}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const rawText = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return NextResponse.json(decodedUser);
    }

    const data = rawText
      ? (JSON.parse(rawText) as {
          item?: {
            id?: string;
            name?: string;
            username?: string;
          };
        })
      : null;

    const item = data?.item;

    return NextResponse.json({
      id: item?.id ?? decodedUser.id,
      name: item?.name ?? decodedUser.name,
      username: item?.username ?? decodedUser.username,
    });
  } catch {
    return NextResponse.json(decodedUser);
  }
}
