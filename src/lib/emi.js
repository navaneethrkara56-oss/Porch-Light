/**
 * Calculate Monthly EMI for home loan in India
 * @param {number} principal - Loan amount in INR
 * @param {number} annualRate - Annual interest rate (e.g. 8.5 for 8.5%)
 * @param {number} tenureYears - Loan tenure in years (e.g. 20)
 */
export function calculateEMI(principal, annualRate = 8.5, tenureYears = 20) {
  if (!principal || principal <= 0) return 0;
  const monthlyRate = annualRate / (12 * 100);
  const totalMonths = tenureYears * 12;
  
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
              (Math.pow(1 + monthlyRate, totalMonths) - 1);
              
  const totalPayment = emi * totalMonths;
  const totalInterest = totalPayment - principal;

  return {
    monthlyEMI: Math.round(emi),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    principal: Math.round(principal)
  };
}
