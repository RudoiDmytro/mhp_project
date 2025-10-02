import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { categorizeBill } from "@/lib/keywords";
import { sendDigestEmail } from "@/lib/emailService";
import { fetchRadaDataset } from "@/lib/radaApiService";

// It's good practice to initialize Redis only once.
const redis = Redis.fromEnv();
const SEEN_BILLS_CACHE_KEY = "rada_seen_bills_ids";

export async function GET(request: Request) {
  console.log("CRON JOB TRIGGERED");
  const authToken = (request.headers.get("authorization") || "").split("Bearer ")[1];
  
  if (authToken !== process.env.CRON_SECRET) {
    console.error("Unauthorized access attempt.");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // STEP 1: Fetch external and cached data
    console.log("Fetching all bills from API...");
    const allBills = await fetchRadaDataset();
    console.log(`Fetched a total of ${allBills.length} bills.`);

    console.log(`Attempting to fetch seen bill IDs from Redis cache with key: ${SEEN_BILLS_CACHE_KEY}`);
    const seenBillIds: string[] = await redis.smembers(SEEN_BILLS_CACHE_KEY);
    
    // --- CRITICAL DIAGNOSTIC LOG ---
    console.log(`Retrieved ${seenBillIds.length} seen bill IDs from Redis.`);
    if (seenBillIds.length > 0) {
        // Log the first few IDs to confirm we are getting real data
        console.log(`Sample of seen IDs from cache: [${seenBillIds.slice(0, 3).join(", ")}]`);
    }
    // --- END DIAGNOSTIC ---

    const seenBillIdsSet = new Set(seenBillIds);

    // STEP 2: Process data to find what's new
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

    // STEP 3: Act on the new data
    if (newRelevantBills.length > 0) {
      console.log(`Found ${newRelevantBills.length} new relevant bills to process.`);
      
      // Update cache BEFORE sending the email to prevent double-sends
      if (newlyFoundBillIds.length > 0) {
        console.log(`Attempting to add ${newlyFoundBillIds.length} new bill IDs to Redis cache...`);
        
        // --- CRITICAL DIAGNOSTIC ---
        // Capture the result of the SADD command. It returns the number of elements actually added.
        const addResult = await redis.sadd(SEEN_BILLS_CACHE_KEY, newlyFoundBillIds);
        console.log(`Redis 'sadd' command finished. Number of new elements added to the set: ${addResult}.`);
        if (addResult !== newlyFoundBillIds.length) {
            console.warn("Warning: The number of IDs added to Redis does not match the number of new bills found. This could indicate some IDs already existed in the set unexpectedly.");
        }
        // --- END DIAGNOSTIC ---
      }

      console.log("Sending digest email...");
      await sendDigestEmail(newRelevantBills);
      console.log("Email sent successfully.");

    } else {
      console.log("No new relevant bills found. Nothing to do.");
    }

    console.log("CRON JOB COMPLETED SUCCESSFULLY");
    return NextResponse.json({
      success: true,
      foundBills: newRelevantBills.length,
    });

  } catch (error) {
    console.error('[CRON JOB FAILED]', error);
    // Log the full error object for more details
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}