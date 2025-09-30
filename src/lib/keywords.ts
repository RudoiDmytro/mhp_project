
export type BillCategory = "Соціальна" | "Аграрна" | "Корпоративна";

export const KEYWORD_CATEGORIES: Record<BillCategory, string[]> = {
  'Аграрна': [
    'земельн',
    'субсиді',
    'експортн',
    'квот',
    'фітосанітар',
    'ринок землі',
    'сільськогосподар',
    'аграрн',
    'фермерськ',
    'оренда землі',
    'ділянк',           
    'землеустрій',       
    'кадастр',           
    'приватизаці',        
    'майн',               
    'продовольств',
    'меліораці', 
  ],
  'Соціальна': [
    'трудов',
    'соціальн',
    'пенсійн',
    'охорона праці',
    'зайнятіст',
    'профспілк',
    'внеск',
    'пенсі',            
    'прожитков',         
    'ветеран',           
    'військовослужбов',   
    'гаранті',          
    'захищеніст',       
    'здоров',            
    'навколишн',          
    'оплат',             
    'відпустк',         
  ],
  'Корпоративна': [
    'оподаткуван',
    'податк',
    'валютн',
    'корпоративн',
    'акціонерн',
    'цінні папери',
    'злиття та поглинання',
    'ПДВ',
    'платник',          
    'акцизн',            
    'ставк',             
    'адмініструван',     
    'мит',               
    'сплат',            
    'дохід',            
    'звітніст',          
    'кредитуван',         
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
