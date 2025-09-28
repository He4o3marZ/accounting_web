class CashflowManager {
	processCashflow(transactions = [], currency = '€') {
		const totals = {
			totalInflow: 0,
			totalOutflow: 0,
			netCashflow: 0,
			transactionCount: transactions.length,
			currency
		};

		for (const tx of transactions) {
			const amount = Number(tx.amount) || 0;
			if (amount > 0) totals.totalInflow += amount;
			else if (amount < 0) totals.totalOutflow += Math.abs(amount);
		}

		totals.netCashflow = totals.totalInflow - totals.totalOutflow;

		// Build a simple daily summary
		const byDate = new Map();
		for (const tx of transactions) {
			const date = (tx.date || '').toString().slice(0, 10) || 'unknown';
			const amount = Number(tx.amount) || 0;
			if (!byDate.has(date)) {
				byDate.set(date, { date, inflow: 0, outflow: 0, net: 0 });
			}
			const agg = byDate.get(date);
			if (amount > 0) agg.inflow += amount; else agg.outflow += Math.abs(amount);
			agg.net = agg.inflow - agg.outflow;
		}

		const dailySummary = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

		return {
			totals,
			transactions,
			dailySummary,
			trends: {},
			alerts: [],
			highlights: [],
			recommendations: []
		};
	}
}

module.exports = CashflowManager;




