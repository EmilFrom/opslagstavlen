import { NextResponse } from "next/server";

const PLANKA_BASE_URL =
  process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

interface AuthRequestBody {
  username?: string;
  password?: string;
}

type ParsedAuthResponse = {
  item?: string | { token?: string };
  error?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthRequestBody;

    if (!body?.username || !body?.password) {
      return NextResponse.json(
        { error: "Missing username or password." },
        { status: 400 },
      );
    }

    const upstreamResponse = await fetch(`${PLANKA_BASE_URL}/api/access-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailOrUsername: body.username,
        password: body.password,
      }),
      cache: "no-store",
    });

    const rawText = await upstreamResponse.text();

    let data: ParsedAuthResponse | null = null;

    try {
      data = rawText ? (JSON.parse(rawText) as ParsedAuthResponse) : null;
    } catch {
      data = null;
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error:
            data && "error" in data
              ? data.error
              : data && "message" in data
                ? data.message
                : "Authentication failed.",
        },
        { status: upstreamResponse.status },
      );
    }

    const token =
      typeof data?.item === "string"
        ? data.item
        : typeof data?.item?.token === "string"
          ? data.item.token
          : undefined;

    const response = NextResponse.json({ token: token ?? null });

    const upstreamHeaders = upstreamResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };

    const upstreamSetCookies =
      upstreamHeaders.getSetCookie?.() ??
      (upstreamResponse.headers.get("set-cookie")
        ? [upstreamResponse.headers.get("set-cookie") as string]
        : []);

    for (const cookieValue of upstreamSetCookies) {
      response.headers.append("set-cookie", cookieValue);
    }

    if (token) {
      response.cookies.set("planka_jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to authenticate right now." },
      { status: 500 },
    );
  }
}
