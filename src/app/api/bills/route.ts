import { NextResponse } from "next/server";
import { parseISO, isWithinInterval } from "date-fns";
import { Redis } from "@upstash/redis";
import { categorizeBill, BillCategory } from "@/lib/keywords";
import { getValidToken } from "@/lib/tokenManager";

interface RadaBill {
  id: number;
  name: string;
  url: string;
  registrationNumber: string;
  registrationDate: string;
  bind: number[];
  alternative: number[];
}
interface AnalyzedBill {
  number: string;
  title: string;
  registration_date: string;
  url: string;
  categories: BillCategory[];
  binds: number[];
  alternatives: number[];
}

const redis = Redis.fromEnv();
const CACHE_KEY_PREFIX = "rada_result";
const CACHE_EXPIRATION_SECONDS = 3600;

const RADA_BILLS_URL =
  "https://data.rada.gov.ua/ogd/zpr/skl9/billinfo-skl9.json";

async function fetchAndProcessFullDataset(): Promise<RadaBill[]> {
  console.log("Fetching full dataset from Rada API...");
  const token = await getValidToken();
  const headers = { "User-Agent": token };

  const response = await fetch(RADA_BILLS_URL, { headers });

  if (!response.ok) {
    throw new Error(
      `Не вдалося завантажити дані з API Ради, статус: ${response.status}`
    );
  }

  const rawText = await response.text();
  const cleanedText = rawText.replace(/[\x00-\x1F]/g, " ");

  return JSON.parse(cleanedText) as RadaBill[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");

  if (!startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "Необхідно вказати початкову та кінцеву дати" },
      { status: 400 }
    );
  }
  const cacheKey = `${CACHE_KEY_PREFIX}_${startDateStr}_${endDateStr}`;

  try {
    const cachedResult = await redis.get<AnalyzedBill[]>(cacheKey);

    if (cachedResult) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return NextResponse.json(cachedResult);
    }

    console.log(`Cache miss for key: ${cacheKey}. Processing data...`);

    const allBills = await fetchAndProcessFullDataset();

    const searchInterval = {
      start: parseISO(startDateStr),
      end: new Date(
        new Date(endDateStr).setDate(new Date(endDateStr).getDate() + 1)
      ),
    };

    const analyzedBills = allBills
      .filter((bill) => {
        try {
          const billDate = parseISO(bill.registrationDate);
          return isWithinInterval(billDate, searchInterval);
        } catch (e) {
          return false;
        }
      })
      .map(
        (bill): AnalyzedBill => ({
          number: bill.registrationNumber,
          title: bill.name,
          registration_date: bill.registrationDate.split("T")[0],
          url: bill.url,
          categories: categorizeBill(bill.name),
          binds: bill.bind || [],
          alternatives: bill.alternative || [],
        })
      )
      .filter((bill) => bill.categories.length > 0);

    const uniqueBills = Array.from(
      new Map(analyzedBills.map((bill) => [bill.number, bill])).values()
    );

    await redis.set(cacheKey, uniqueBills, {
      ex: CACHE_EXPIRATION_SECONDS,
      nx: true,
    });
    console.log(`Result for key ${cacheKey} is now cached.`);

    return NextResponse.json(uniqueBills);
  } catch (error) {
    console.error("API logic error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Не вдалося обробити запит";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
