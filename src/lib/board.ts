const BOARD_NAME_TRANSLATIONS: Record<string, string> = {
  archive: "Arkiv",
  trash: "Papirkurv",
};

export function getBoardDisplayName(name: string): string {
  const normalizedName = name.trim().toLowerCase();
  return BOARD_NAME_TRANSLATIONS[normalizedName] ?? name;
}
