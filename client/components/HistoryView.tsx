
import React from 'react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  gameHistory: number[];
}

const statusStyle = (status: Transaction['status']) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-[#28a909]/15 text-[#6fe07a]';
    case 'PENDING':
      return 'bg-[#ffc107]/15 text-[#ffc107]';
    default:
      return 'bg-red-500/15 text-red-400';
  }
};

export const HistoryView: React.FC<Props> = ({ transactions, gameHistory }) => {
  return (
    <div className="w-full space-y-8">
      <section>
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
          Transactions
        </h3>
        <div className="bg-[#0f1012] rounded-xl border border-[#2d2d2d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1b1c1d] text-[10px] text-gray-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]/60">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-600 italic">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-bold text-xs">
                        <span
                          className={t.type === 'DEPOSIT' ? 'text-[#6fe07a]' : 'text-[#ffc107]'}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black tabular-nums">
                        ${t.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{t.method}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusStyle(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                        {new Date(t.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
          Round History
        </h3>
        {gameHistory.length === 0 ? (
          <p className="text-gray-600 italic text-sm">No rounds played yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {gameHistory.map((mult, idx) => (
              <div
                key={idx}
                className="bg-[#0f1012] border border-[#2d2d2d] rounded-lg py-3 text-center"
              >
                <p
                  className={`text-base font-black tabular-nums ${
                    mult >= 10
                      ? 'text-[#913ef8]'
                      : mult >= 2
                        ? 'text-[#34b4ff]'
                        : 'text-gray-400'
                  }`}
                >
                  {mult.toFixed(2)}x
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
