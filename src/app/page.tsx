// src/app/page.tsx
'use client';

// 1. Імпортуємо useEffect з React
import { useState, FormEvent, useEffect } from 'react';
import { format, sub } from 'date-fns';
import { BillCategory } from '@/lib/keywords';
import Link from 'next/link';

interface AnalyzedBill {
  number: string;
  title: string;
  registration_date: string;
  url: string;
  categories: BillCategory[];
  binds: number[];
  alternatives: number[];
}
const BillCard = ({ bill }: { bill: AnalyzedBill}) => {

  const categoryColors: Record<BillCategory, string> = {
    'Аграрна': 'bg-green-100 text-green-800 border-green-400',
    'Соціальна': 'bg-blue-100 text-blue-800 border-blue-400',
    'Корпоративна': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  };

  const renderRelatedBills = (billIds: number[], type: 'Зв\'язаний' | 'Альтернативний') => {
    if (!billIds || billIds.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-600 mb-1">{type}:</h4>
        <ul className="list-disc list-inside text-sm">
          {billIds.map(id => {
            const relatedUrl = `https://itd.rada.gov.ua/billInfo/Bills/Card/${id}`;
            return (
              <li key={id}>
                <a href={relatedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Законопроєкт (ID: {id})
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-800">{bill.title}</h3>
        <Link
          href={bill.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline whitespace-nowrap ml-4 px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          № {bill.number}
        </Link>
      </div>
      <p className="text-sm text-gray-500 mt-1">Дата реєстрації: {format(new Date(bill.registration_date), 'dd.MM.yyyy')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {bill.categories.map(category => (
          <span key={category} className={`px-2 py-1 text-xs font-medium rounded-full border ${categoryColors[category]}`}>
            {category}
          </span>
        ))}
      </div>
      {renderRelatedBills(bill.binds, 'Зв\'язаний')}
      {renderRelatedBills(bill.alternatives, 'Альтернативний')}
    </div>
  );
};

export default function HomePage() {
  const [startDate, setStartDate] = useState(format(sub(new Date(), { days: 7 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bills, setBills] = useState<AnalyzedBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = async (start: string, end: string) => {
    setIsLoading(true);
    setError(null);
    setBills([]);

    try {
      const response = await fetch(`/api/bills?startDate=${start}&endDate=${end}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Помилка мережі або сервера');
      }
      const data: AnalyzedBill[] = await response.json();
      setBills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сталася невідома помилка');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(startDate, endDate);
  }, []); // Порожній масив означає, що цей ефект виконається лише один раз

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    fetchBills(startDate, endDate);
  };

  return (
    <main className="container mx-auto p-4 md:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Аналізатор Законодавства</h1>
        <p className="text-lg text-gray-600 mt-2">
          MVP для автоматичного моніторингу законопроєктів для агрохолдингу.
        </p>
      </header>

      <section className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Початкова дата</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            />
          </div>
          <div className="w-full">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Кінцева дата</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto mt-4 md:mt-0 self-end px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Аналіз...' : 'Знайти'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Результати аналізу</h2>
        {isLoading && <p className="text-center">Завантаження законопроєктів...</p>}
        {error && <p className="text-center text-red-500">Помилка: {error}</p>}
        {!isLoading && !error && bills.length === 0 && (
          <p className="text-center text-gray-500">Релевантних законопроєктів за обраний період не знайдено.</p>
        )}
        <div>
          {bills.map(bill => (
            <BillCard key={bill.number} bill={bill}/>
          ))}
        </div>
      </section>
    </main>
  );
}