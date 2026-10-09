export const chartPeriods = ['year', 'quarter', 'month', 'week', 'previous', 'current'];
export const chartPeriodLabels = {year:'12개월 전', quarter:'3개월 전', month:'1개월 전', week:'1주일 전', previous:'직전 마감', current:'현재'};

// Match comparison periods, preserving gaps and each market's actual observation date.
export function compareIndicators(items) {
  const baseline = chartPeriods.find(key => items.length === 2 && items.every(item => Number.isFinite(item.values[key]) && item.values[key] !== 0));
  return {
    baseline,
    series: items.map(item => ({
      item,
      points: chartPeriods.map((key, index) => {
        const value = item.values[key], base = item.values[baseline];
        const percent = baseline && Number.isFinite(value) ? (value - base) / Math.abs(base) * 100 : null;
        return {key, index, value, date:item.dates[key], percent:Number.isFinite(percent) ? percent : null};
      }),
    })),
  };
}
