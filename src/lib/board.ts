import { DA_TRANSLATIONS } from "@/lib/i18n";

const BOARD_NAME_TRANSLATIONS: Record<string, string> = DA_TRANSLATIONS.boardNames;

export function getBoardDisplayName(name: string): string {
  const normalizedName = name.trim().toLowerCase();
  return BOARD_NAME_TRANSLATIONS[normalizedName] ?? name;
}
