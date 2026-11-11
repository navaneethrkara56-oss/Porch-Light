import { jsPDF } from 'jspdf';
import { getPayments } from './payments';
import { formatINR } from '@/lib/formatINR';
import { formatPaymentDate } from '@/lib/formatDate';

export function generatePaymentReceiptPDF(payment) {
  const doc = new jsPDF();

  // Header styling
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(94, 79, 122); // Deep purple #5E4F7A
  doc.text('Porch Light', 20, 25);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(143, 127, 168);
  doc.text('Leave the light on for home.', 20, 32);

  doc.setDrawColor(200, 195, 185);
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);

  // Receipt details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(38, 38, 43);
  doc.text('PAYMENT RECEIPT & BOOKING TOKEN', 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);

  let y = 62;
  const addRow = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 80, y);
    y += 8;
  };

  const dateVal = payment.paidAt || payment.createdAt || payment.timestamp || Date.now();
  const formatType = (t) => {
    if (t === 'emi_installment') return 'Monthly EMI Installment';
    if (t === 'rent_installment') return 'Monthly Rent Payment';
    if (t === 'full_purchase') return 'Full Purchase Acquisition';
    if (t === 'emi_down_payment') return 'EMI Down Payment & Agreement';
    if (t === 'rent_deposit') return 'Rental Security Deposit & Advance';
    if (t === 'token_amount') return 'Token Advance / Booking Fee';
    return String(t || 'Payment').replace('_', ' ');
  };

  addRow('Transaction ID:', payment.id || payment.customId);
  addRow('Receipt Number:', payment.receiptNumber || 'REC-2026-N/A');
  addRow('Date & Time:', formatPaymentDate(payment, { includeTime: true }));
  addRow('Payer Name:', payment.userName || 'Verified Member');
  addRow('Property:', payment.propertySnapshot?.title || payment.propertyTitle || 'Property');
  addRow('Location:', `${payment.propertySnapshot?.locality || ''}, ${payment.propertySnapshot?.city || ''}`);
  addRow('Payment Type:', formatType(payment.type));
  addRow('Payment Mode:', payment.method || 'Online UPI');
  addRow('Total Amount Paid:', `INR ${formatINR(payment.amount)}`);

  // Box around amount
  doc.setDrawColor(94, 79, 122);
  doc.setFillColor(241, 236, 227);
  doc.roundedRect(20, y + 5, 170, 22, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(94, 79, 122);
  doc.text(`Confirmed Amount: INR ${formatINR(payment.amount)}`, 28, y + 19);

  // Legal footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('DEMO. Not a legal document.', 20, 280);
  doc.text('Porch Light Real Estate Technologies India Pvt Ltd', 120, 280);

  doc.save(`${payment.id}_receipt.pdf`);
}

export async function getUserDocuments() {
  const payRes = await getPayments();
  const payments = payRes.data || payRes || [];
  return payments.map((p) => ({
    id: `doc_${p.id || p.customId}`,
    paymentId: p.id || p.customId,
    title: `${p.propertyTitle || p.propertySnapshot?.title || 'Property'} — Token Receipt`,
    date: p.paidAt || p.createdAt || p.timestamp,
    type: 'PDF Receipt',
    payment: p,
  }));
}
