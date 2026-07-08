'use client';

import { PageTitle } from '@/components/PageTitle';
import { DailySpend, money, totals } from '@/lib/mock-data';
import { useCrmDatabase } from '@/lib/local-db';

function groupBy(rows: DailySpend[], key: 'geo' | 'agency' | 'offer') {
  return Array.from(new Set(rows.map(r => r[key]))).map((value) => {
    const groupedRows = rows.filter(r => r[key] === value);
    return { name: value, ...totals(groupedRows) };
  });
}

export default function ReportsPage() {
  const { database } = useCrmDatabase();
  const geos = groupBy(database.dailySpend, 'geo');
  const agencies = groupBy(database.dailySpend, 'agency');
  const offers = groupBy(database.dailySpend, 'offer');

  return (
    <>
      <PageTitle title="Reports" subtitle="Geo, agency and offer summaries for scaling decisions." />
      <section className="grid grid-2">
        <div className="card table-wrap">
          <h2>Geo Performance</h2>
          <table><thead><tr><th>Geo</th><th>Spend</th><th>Leads</th><th>CPL</th><th>FTDs</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>{geos.map(g => <tr key={g.name}><td>{g.name}</td><td>{money(g.spend)}</td><td>{g.leads}</td><td>{money(g.cpl)}</td><td>{g.ftds}</td><td>{money(g.revenue)}</td><td className={g.profit >= 0 ? 'positive' : 'negative'}>{money(g.profit)}</td></tr>)}</tbody></table>
        </div>
        <div className="card table-wrap">
          <h2>Agency Performance</h2>
          <table><thead><tr><th>Agency</th><th>Spend</th><th>Leads</th><th>CPL</th><th>FTDs</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>{agencies.map(a => <tr key={a.name}><td>{a.name}</td><td>{money(a.spend)}</td><td>{a.leads}</td><td>{money(a.cpl)}</td><td>{a.ftds}</td><td>{money(a.revenue)}</td><td className={a.profit >= 0 ? 'positive' : 'negative'}>{money(a.profit)}</td></tr>)}</tbody></table>
        </div>
        <div className="card table-wrap">
          <h2>Offer Performance</h2>
          <table><thead><tr><th>Offer</th><th>Spend</th><th>Leads</th><th>CPL</th><th>FTDs</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>{offers.map(o => <tr key={o.name}><td>{o.name}</td><td>{money(o.spend)}</td><td>{o.leads}</td><td>{money(o.cpl)}</td><td>{o.ftds}</td><td>{money(o.revenue)}</td><td className={o.profit >= 0 ? 'positive' : 'negative'}>{money(o.profit)}</td></tr>)}</tbody></table>
        </div>
      </section>
    </>
  );
}
