
export type BillCategory = "Соціальна" | "Аграрна" | "Корпоративна";

export const KEYWORD_CATEGORIES: Record<BillCategory, string[]> = {
  Соціальна: [
    "трудов", 
    "соціальн", 
    "пенсійн", 
    "охорона праці",
    "зайнятіст",
    "профспілк",
    "внеск",
  ],
  Аграрна: [
    "біо",
    "органіч",
    "земельн",
    "субсиді",
    "експортн",
    "квот",
    "фітосанітар",
    "земл",
    "сільськогосподар",
    "аграрн",
    "фермерськ",
    "оренди землі",
  ],
  Корпоративна: [
    "збір",
    "збор",
    "оподаткуван", 
    "податк",
    "валютн",
    "корпоративн",
    "акціонерн",
    "цінні папери",
    "злиття та поглинання",
    "M&A",
    "ПДВ",
  ],
};

export function categorizeBill(title: string): BillCategory[] {
  const categories: BillCategory[] = [];
  const lowerCaseTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.some((keyword) => lowerCaseTitle.includes(keyword))) {
      categories.push(category as BillCategory);
    }
  }

  return categories;
}
