function computeRiskScore({ amountUSDC, dueDate, supplierHistory = 0 }) {
  const daysToDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  let score = 50;
  if (amountUSDC <= 5000) score += 15;
  if (amountUSDC > 25000) score -= 15;
  if (daysToDue >= 30) score += 15;
  if (daysToDue < 14) score -= 10;
  score += Math.min(supplierHistory * 3, 15);
  return Math.max(5, Math.min(95, Math.round(score)));
}

function discountFromRisk(riskScore) {
  if (riskScore >= 80) return 100;
  if (riskScore >= 65) return 200;
  if (riskScore >= 50) return 300;
  if (riskScore >= 35) return 450;
  return 600;
}

function buildOverdueAlerts(invoices) {
  const now = new Date();
  return invoices
    .filter((inv) => ['APPROVED', 'FINANCED'].includes(inv.status))
    .filter((inv) => new Date(inv.due_date) < now)
    .map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      message: `Invoice ${inv.invoice_number} is overdue by ${Math.ceil((now - new Date(inv.due_date)) / 86400000)} days.`
    }));
}

module.exports = { computeRiskScore, discountFromRisk, buildOverdueAlerts };
