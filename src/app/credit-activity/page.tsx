'use client';

import useSWR from 'swr';

interface CreditActivityItem {
  id: string;
  userId: string;
  activity: string;
  amount: number;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CreditActivityPage() {
  const { data, error } = useSWR('/api/credit-activity', fetcher);

  const activities: CreditActivityItem[] = data?.activities || [];

  if (error) return <div>Failed to load credit activities</div>;
  if (!data) return <div>Loading credit activities...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Credit Activity</h1>
      {activities.length === 0 ? (
        <p>No credit activities yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-md shadow-md">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b border-gray-600 text-left text-sm font-semibold text-gray-300">Activity</th>
                <th className="py-2 px-4 border-b border-gray-600 text-left text-sm font-semibold text-gray-300">Amount</th>
                <th className="py-2 px-4 border-b border-gray-600 text-left text-sm font-semibold text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-700">
                  <td className="py-2 px-4 border-b border-gray-700 text-sm text-gray-200">{activity.activity}</td>
                  <td className={`py-2 px-4 border-b border-gray-700 text-sm ${activity.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>{activity.amount}</td>
                  <td className="py-2 px-4 border-b border-gray-700 text-sm text-gray-200">{new Date(activity.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}