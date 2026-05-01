'use client'

import { dictionaries } from '@/lib/i18n/dictionaries'
import type { Appointment, CatalogMaps } from '@/app/dashboard/page'

export function HaircutHistory({
  dict, history, catalog,
}: {
  dict: typeof dictionaries.en
  history: Appointment[]
  catalog: CatalogMaps
}) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mt-8">
      <h2 className="text-sm tracking-widest uppercase font-bold mb-6 text-yellow-500">{dict.history}</h2>

      {history.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{dict.noHistory}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-sm">
                <th className="py-4 font-normal">{dict.date}</th>
                <th className="py-4 font-normal">{dict.service}</th>
                <th className="py-4 font-normal">{dict.barber}</th>
                <th className="py-4 font-normal text-right">{dict.price}</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => {
                const d = new Date(h.appointment_date)
                const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                return (
                  <tr key={h.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors text-white">
                    <td className="py-4">{dateStr}</td>
                    <td className="py-4 font-medium">{catalog.servicesMap[h.service_id] || h.service_id}</td>
                    <td className="py-4 text-gray-400">{catalog.barbersMap[h.barber_id] || h.barber_id}</td>
                    <td className="py-4 text-right">{catalog.pricesMap[h.service_id] || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
