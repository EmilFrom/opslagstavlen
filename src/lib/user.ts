export type SupportedUser = "emil" | "coline";
// Planka displays the user as Nicoline while the username remains @coline.
const COLINE_ALIASES = ["coline", "nicoline"] as const;

export interface JwtPayload {
  id?: string;
  userId?: string;
  name?: string;
  username?: string;
  sub?: string;
}

export function toSupportedUser(value?: string): SupportedUser | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "emil") {
    return "emil";
  }

  if (COLINE_ALIASES.includes(normalized as (typeof COLINE_ALIASES)[number])) {
    return "coline";
  }

  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);

  if (tokens.includes("emil")) {
    return "emil";
  }

  if (
    tokens.some((token) =>
      COLINE_ALIASES.includes(token as (typeof COLINE_ALIASES)[number]),
    )
  ) {
    return "coline";
  }

  return null;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
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
