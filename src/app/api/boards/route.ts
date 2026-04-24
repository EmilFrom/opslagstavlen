import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const upstreamUrl = `${PLANKA_BASE_URL}/api/projects`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

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

      const boards =
        data &&
        typeof data === "object" &&
        "included" in data &&
        data.included &&
        typeof data.included === "object" &&
        "boards" in data.included &&
        Array.isArray(data.included.boards)
          ? data.included.boards
          : [];

      return NextResponse.json(boards, { status: 200 });
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
