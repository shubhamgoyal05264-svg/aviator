
import React from 'react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  gameHistory: number[];
}

export const HistoryView: React.FC<Props> = ({ transactions, gameHistory }) => {
  return (
    <div className="max-w-5xl mx-auto w-full space-y-12 pb-20">
       <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black italic tracking-tighter">FINANCIAL STATEMENTS</h2>
            <button className="text-xs text-aviator-red font-bold hover:underline">EXPORT CSV</button>
          </div>
          <div className="bg-[#141516] rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0d0d0d] text-[10px] text-gray-500 font-black uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left">Reference ID</th>
                  <th className="px-6 py-4 text-left">Type</th>
                  <th className="px-6 py-4 text-left">Amount</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600 font-medium italic">No transactions found in this cycle.</td></tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-blue-400">{t.id}</td>
                      <td className="px-6 py-4 font-bold text-xs">{t.type}</td>
                      <td className="px-6 py-4 font-black text-yellow-500">${t.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-[10px] font-bold">SUCCESSFUL</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(t.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
       </section>

       <section>
          <h2 className="text-2xl font-black italic tracking-tighter mb-6">FLIGHT LOGS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
             {gameHistory.map((mult, idx) => (
               <div key={idx} className="bg-[#141516] border border-white/5 rounded-xl p-4 text-center group hover:border-aviator-red/50 transition-all cursor-pointer">
                  <p className="text-[9px] text-gray-600 font-black mb-1">ROUND #{gameHistory.length - idx}</p>
                  <p className={`text-xl font-black ${mult > 2 ? 'text-purple-500' : mult > 1.2 ? 'text-blue-400' : 'text-gray-400'}`}>{mult.toFixed(2)}x</p>
               </div>
             ))}
          </div>
       </section>
    </div>
  );
};
