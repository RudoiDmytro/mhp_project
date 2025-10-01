export type BillCategory = "Соціальна" | "Аграрна" | "Корпоративна";

export type RadaBill = {
  id: number;
  name: string;
  url: string;
  registrationNumber: string;
  registrationDate: string;
  bind: number[];
  alternative: number[];
};
export type AnalyzedBill = {
  number: string;
  title: string;
  registration_date: string;
  url: string;
  categories: BillCategory[];
  binds: number[];
  alternatives: number[];
};

export type CachedToken = {
  token: string;
  expiresAt: number;
};
export type Bill = {
  number: string;
  title: string;
  url: string;
  date: string;
  categories: string[];
}

export type DailyDigestEmailProps = {
  bills: Bill[];
}