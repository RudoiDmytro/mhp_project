import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { categorizeBill } from "@/lib/keywords";
import { RadaBill } from "@/lib/types";
import { sendDigestEmail } from "@/lib/emailService";
import { getValidToken } from "@/lib/tokenManager";

const redis = Redis.fromEnv();

const RADA_BILLS_URL =
  "https://data.rada.gov.ua/ogd/zpr/skl9/billinfo-skl9.json";
const SEEN_BILLS_CACHE_KEY = "rada_seen_bills_ids";

export async function GET(request: Request) {
  const authToken = (request.headers.get("authorization") || "").split(
    "Bearer "
  )[1];
  if (authToken !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  console.log("Starting daily digest cron job...");

  const token = await getValidToken();
  const headers = { "User-Agent": token };

  const response = await fetch(RADA_BILLS_URL, { headers });
  if (!response.ok) {
    throw new Error(
      `Не вдалося завантажити дані з API Ради, статус: ${response.status}`
    );
  }

  const allBills: RadaBill[] = await response.json();

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
    try {
      await sendDigestEmail(newRelevantBills);
      console.log("Email sent successfully.");
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  } else {
    console.log("No new relevant bills found.");
  }

  if (newBillIdsToCache.length > 0) {
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
}
