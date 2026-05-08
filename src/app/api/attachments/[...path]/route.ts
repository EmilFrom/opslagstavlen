import { type NextRequest, NextResponse } from "next/server";

const PLANKA_BASE_URL = process.env.PLANKA_BASE_URL ?? "https://tavlen.emilfrom.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = request.cookies.get("planka_jwt")?.value;

  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  const attachmentPath = path.join("/");
  const plankaUrl = `${PLANKA_BASE_URL}/attachments/${attachmentPath}`;

  try {
    const response = await fetch(plankaUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return new NextResponse("Attachment not found", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[ATTACHMENT_PROXY_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
