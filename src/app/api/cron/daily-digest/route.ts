import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { categorizeBill } from "@/lib/keywords";
import { sendDigestEmail } from "@/lib/emailService";
import { fetchRadaDataset } from "@/lib/radaApiService";

const redis = Redis.fromEnv();
const SEEN_BILLS_CACHE_KEY = "rada_seen_bills_ids";

export async function GET(request: Request) {
  const authToken = (request.headers.get("authorization") || "").split(
    "Bearer "
  )[1];
  if (authToken !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("Starting daily digest cron job...");
    const allBills = await fetchRadaDataset();
    const seenBillIds = await redis.smembers(SEEN_BILLS_CACHE_KEY);
    const seenBillIdsSet = new Set(seenBillIds);
    console.log(`Retrieved ${seenBillIdsSet.size} seen bill IDs from cache.`);

    const newRelevantBills = [];
    const newlyFoundBillIds: string[] = [];

    for (const bill of allBills) {
      const billIdStr = bill.id.toString();
      if (!seenBillIdsSet.has(billIdStr)) {
        const categories = categorizeBill(bill.name);
        if (categories.length > 0) {
          newRelevantBills.push({
            title: bill.name,
            url: bill.url,
            number: bill.registrationNumber,
            date: bill.registrationDate.split("T")[0],
            categories,
          });
          newlyFoundBillIds.push(billIdStr);
        }
      }
    }

    if (newRelevantBills.length > 0) {
      console.log(`Found ${newRelevantBills.length} new relevant bills.`);

      if (newlyFoundBillIds.length > 0) {
        console.log(
          `Adding ${newlyFoundBillIds.length} new bill IDs to the 'seen' cache...`
        );

        await redis.sadd(SEEN_BILLS_CACHE_KEY, newlyFoundBillIds);
        console.log("Successfully added new bill IDs to the cache.");
      }

      console.log("Sending digest email...");
      await sendDigestEmail(newRelevantBills);
      console.log("Email sent successfully.");
    } else {
      console.log("No new relevant bills found.");
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
