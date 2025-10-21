'use client';

import useSWR from 'swr';
import { useI18n } from '@/lib/i18n/context';

interface CreditActivityItem {
  id: string;
  userId: string;
  activity: string;
  amount: number;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CreditActivityPage() {
  const { t } = useI18n();
  const { data, error } = useSWR('/api/credit-activity', fetcher);

  const activities: CreditActivityItem[] = data?.activities || [];

  if (error) return <div>{t('creditActivity.loadFailed')}</div>;
  if (!data) return <div>{t('creditActivity.loading')}</div>;

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">{t('creditActivity.title')}</h1>
        {activities.length === 0 ? (
          <p>{t('creditActivity.noActivities')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-secondary rounded-md shadow-md border border-border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-border text-left text-sm font-semibold text-foreground">{t('creditActivity.activity')}</th>
                  <th className="py-2 px-4 border-b border-border text-left text-sm font-semibold text-foreground">{t('creditActivity.amount')}</th>
                  <th className="py-2 px-4 border-b border-border text-left text-sm font-semibold text-foreground">{t('creditActivity.date')}</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-background/50">
                    <td className="py-2 px-4 border-b border-border text-sm text-foreground">{activity.activity}</td>
                    <td className={`py-2 px-4 border-b border-border text-sm ${activity.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>{activity.amount}</td>
                    <td className="py-2 px-4 border-b border-border text-sm text-foreground">{new Date(activity.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}