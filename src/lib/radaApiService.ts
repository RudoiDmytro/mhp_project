import { getValidToken } from "./tokenManager";
import { RadaBill } from "./types";

const RADA_BILLS_URL =
  "https://data.rada.gov.ua/ogd/zpr/skl9/billinfo-skl9.json";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchRadaDataset(): Promise<RadaBill[]> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Rada Service] Attempt ${attempt}/${MAX_RETRIES} to fetch full dataset...`
      );

      const token = await getValidToken();

      const headers = {
        "User-Agent": token,
      };

      const response = await fetch(RADA_BILLS_URL, { headers });
      if (!response.ok) {
        throw new Error(
          `Failed to download dataset, status: ${response.status}`
        );
      }

      const rawText = await response.text();
      const cleanedText = rawText.replace(/[\x00-\x1F]/g, " ");
      const allBills: RadaBill[] = JSON.parse(cleanedText);

      console.log(
        `[Rada Service] Dataset fetched successfully, ${allBills.length} bills found.`
      );
      // Якщо все успішно, повертаємо результат і виходимо з циклу
      return allBills;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `[Rada Service] Attempt ${attempt} failed: ${error instanceof Error ? error.message : "Не вдалося обробити запит"}`
      );
      if (attempt < MAX_RETRIES) {
        console.log(`[Rada Service] Retrying in ${RETRY_DELAY_MS}ms...`);
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  // Якщо всі спроби були невдалими, викидаємо останню помилку
  console.error("[Rada Service] All attempts to fetch the dataset failed.");
  throw lastError;
}
