import { NextResponse } from "next/server";
import { categorizeBill } from "@/lib/keywords";
import { sendDigestEmail } from "@/lib/emailService";
import { fetchRadaDataset } from "@/lib/radaApiService";

const BILLS_TO_PROCESS_FOR_TEST = 100; // Скільки законопроєктів аналізувати для тесту

export async function GET(request: Request) {
  // 1. Захищаємо роут тим же секретом, що й тест email
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.EMAIL_TEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("--- Starting cron job TEST ---");

    const allBills = await fetchRadaDataset();

    // 3. Аналізуємо лише невелику частину, ІГНОРУЮЧИ кеш "бачених"
    console.log(`Analyzing first ${BILLS_TO_PROCESS_FOR_TEST} bills...`);
    const newRelevantBills = [];

    for (const bill of allBills.slice(0, BILLS_TO_PROCESS_FOR_TEST)) {
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

    // 4. Якщо щось знайдено, надсилаємо лист на ТЕСТОВУ пошту
    if (newRelevantBills.length > 0) {
      console.log(
        `Found ${newRelevantBills.length} relevant bills in test slice. Sending test email...`
      );
      // Надсилаємо лист на адресу з SMTP_USER, щоб не спамити юристам
      await sendDigestEmail(newRelevantBills);
    } else {
      console.log("No relevant bills found in the test slice.");
    }

    // 5. Найголовніше: НЕ оновлюємо основний кеш SEEN_BILLS_CACHE_KEY
    console.log(
      "--- Cron job TEST finished successfully (state was NOT modified) ---"
    );

    return NextResponse.json({
      success: true,
      message: "Тест завершено. Перевірте консоль та вашу поштову скриньку.",
      foundBills: newRelevantBills.length,
    });
  } catch (error) {
    console.error("--- Cron job TEST failed ---", error);
    return NextResponse.json(
      {
        success: false,
        error: "Помилка під час виконання тесту. Дивіться логи.",
      },
      { status: 500 }
    );
  }
}
