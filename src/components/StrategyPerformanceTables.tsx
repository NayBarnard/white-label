type PerformanceRow = {
  period: string;
  portfolio: string;
  benchmark: string;
};

function PerformanceTable({
  title,
  strategyName,
  rows,
}: {
  title: string;
  strategyName: string;
  rows: PerformanceRow[];
}) {
  return (
    <div className="glass-card min-w-0 w-full p-4 sm:p-5">
      <h3 className="funds-card-title mb-3">{title}</h3>
      <table className="w-full table-fixed text-xs leading-5">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[37%]" />
          <col className="w-[35%]" />
        </colgroup>
        <thead className="text-left text-[10px] leading-tight text-[var(--muted)] sm:text-[11px]">
          <tr>
            <th scope="col" className="px-1.5 py-2 font-semibold sm:px-2.5 sm:py-2.5">
              Period
            </th>
            <th scope="col" className="break-words px-1.5 py-2 font-semibold sm:px-2.5 sm:py-2.5">
              {strategyName}
            </th>
            <th scope="col" className="break-words px-1.5 py-2 font-semibold sm:px-2.5 sm:py-2.5">
              Benchmark
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-t border-[var(--border)]">
              <th scope="row" className="px-1.5 py-2 text-left font-medium sm:px-2.5 sm:py-2.5">
                {row.period}
              </th>
              <td className="px-1.5 py-2 font-semibold sm:px-2.5 sm:py-2.5">
                {row.portfolio}
              </td>
              <td className="px-1.5 py-2 text-[var(--muted)] sm:px-2.5 sm:py-2.5">
                {row.benchmark}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StrategyPerformanceTables({
  strategyName,
  cumulativeRows,
  annualisedRows,
}: {
  strategyName: string;
  cumulativeRows: PerformanceRow[];
  annualisedRows: PerformanceRow[];
}) {
  return (
    <div className="grid min-w-0 max-w-full content-start gap-5">
      <PerformanceTable
        title="Cumulative performance (%)"
        strategyName={strategyName}
        rows={cumulativeRows}
      />
      <PerformanceTable
        title="Annualised performance (%)"
        strategyName={strategyName}
        rows={annualisedRows}
      />
    </div>
  );
}
