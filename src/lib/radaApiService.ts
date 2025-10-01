// src/lib/radaApiService.ts

import { getValidToken } from './tokenManager';
import { RadaBill } from './types';

const RADA_BILLS_URL =
  "https://data.rada.gov.ua/ogd/zpr/skl9/billinfo-skl9.json";

export async function fetchRadaDataset(): Promise<RadaBill[]> {
  console.log("Fetching full dataset via radaApiService...");
  
  const token = await getValidToken();
  
  const headers = { 
    "User-Agent": token 
  };
  
  const response = await fetch(RADA_BILLS_URL, { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to download dataset from Rada API, status: ${response.status}`
    );
  }

  const rawText = await response.text();
  const cleanedText = rawText.replace(/[\x00-\x1F]/g, ' ');
  const allBills: RadaBill[] = JSON.parse(cleanedText);

  console.log(`Dataset fetched successfully, ${allBills.length} bills found.`);
  return allBills;
}