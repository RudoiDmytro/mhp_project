import { NextResponse } from 'next/server';
import { sendDigestEmail } from '@/lib/emailService';
import { Bill } from '@/lib/types';

const mockBills: Bill[] = [
  {
    number: 'ТЕСТ-001',
    title: 'Тестовий законопроєкт про розвиток аграрного сектору',
    url: 'https://itd.rada.gov.ua/billInfo/Bills/Card/1',
    date: new Date().toISOString().split('T')[0],
    categories: ['Аграрна', 'Корпоративна'],
  },
  {
    number: 'ТЕСТ-002',
    title: 'Тестовий законопроєкт про соціальні гарантії для працівників',
    url: 'https://itd.rada.gov.ua/billInfo/Bills/Card/2',
    date: new Date().toISOString().split('T')[0],
    categories: ['Соціальна'],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.EMAIL_TEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- Starting email test ---');
    const success = await sendDigestEmail(mockBills);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Тестовий лист успішно надіслано!',
      });
    } else {
      throw new Error('sendDigestEmail function returned false.');
    }
  } catch (error) {
    console.error('--- Email test failed ---', error);
    return NextResponse.json(
      { success: false, error: 'Не вдалося надіслати тестовий лист. Перевірте логи сервера.' },
      { status: 500 }
    );
  }
}