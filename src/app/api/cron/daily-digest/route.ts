// src/app/api/cron/daily-digest/route.ts

import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { categorizeBill } from "@/lib/keywords";
import { sendDigestEmail } from "@/lib/emailService";
import { fetchRadaDataset } from "@/lib/radaApiService";

const redis = Redis.fromEnv();
const SEEN_BILLS_CACHE_KEY = "rada_seen_bills_ids";

export async function GET(request: Request) {
  // Захист роута
  const authToken = (request.headers.get("authorization") || "").split(
    "Bearer "
  )[1];
  if (authToken !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("Starting daily digest cron job...");

    // 2. Отримуємо дані ОДНИМ рядком. Вся логіка (токен, заголовки, очистка) прихована всередині.
    const allBills = await fetchRadaDataset();

    // 3. Решта логіки залишається без змін
    const seenBillIds = await redis.smembers(SEEN_BILLS_CACHE_KEY);
    const seenBillIdsSet = new Set(seenBillIds);

    const newRelevantBills = [];
    const newBillIdsToCache = [];

    for (const bill of allBills) {
      newBillIdsToCache.push(bill.id.toString());
      if (!seenBillIdsSet.has(bill.id.toString())) {
        const categories = categorizeBill(bill.name);
        if (categories.length > 0) {
          newRelevantBills.push({
            title: bill.name,
            url: bill.url,
            number: bill.registrationNumber,
            date: bill.registrationDate.split("T")[0],
            categories,
          });
        }
      }
    }

    if (newRelevantBills.length > 0) {
      console.log(
        `Found ${newRelevantBills.length} new relevant bills. Sending email...`
      );
      await sendDigestEmail(newRelevantBills);
      console.log("Email sent successfully.");
    } else {
      console.log("No new relevant bills found.");
    }

    if (newBillIdsToCache.length > 0) {
      // Важливо! Використовуємо DEL + SADD для повного оновлення.
      await redis.del(SEEN_BILLS_CACHE_KEY);
      await redis.sadd(SEEN_BILLS_CACHE_KEY, newBillIdsToCache);
      console.log(
        `Updated seen bills cache with ${newBillIdsToCache.length} IDs.`
      );
    }

    return NextResponse.json({
      success: true,
      foundBills: newRelevantBills.length,
    });
  } catch (error) {
    console.error("[CRON JOB FAILED]", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
