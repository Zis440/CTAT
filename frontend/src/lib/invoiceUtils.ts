import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Transaction } from "@/types/wallet";

async function svgToPngDataUrl(svgString: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export async function downloadInvoice(tx: Transaction, user: any) {

  if (tx.type !== "credit" && !tx.description.toLowerCase().includes("recharge")) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let currentY = 25;

  try {
    const response = await fetch('/psyichub-report-logo.png');
    const blob = await response.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    doc.addImage(base64Data, 'PNG', 14, 15, 40, 21);
  } catch (e) {
    console.warn("Failed to load logo for PDF", e);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("LOGO", 14, 25);
  }

  doc.setFontSize(32);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - 14, 30, { align: "right" });

  currentY = 55;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice to:", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.text("Invoice#", pageWidth - 60, currentY);
  const invoiceId = `${tx.id.substring(0, 8).toUpperCase()}`;
  doc.text(invoiceId, pageWidth - 14, currentY, { align: "right" });

  currentY += 8;

  let entityName = "Customer";
  if (user?.account_type === "clinic" || user?.account_type === "organization") {
    entityName = user.clinic_name || "Organization";
  } else if (user?.account_type === "individual") {
    entityName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : "Individual Psychologist";
  } else {
    entityName = user?.clinic_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : "Customer");
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(entityName, 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Date", pageWidth - 60, currentY);
  const invoiceDate = format(new Date(tx.created_at), "dd / MM / yyyy");
  doc.text(invoiceDate, pageWidth - 14, currentY, { align: "right" });

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  if (user?.address) {
    const splitAddress = doc.splitTextToSize(user.address, 70);
    doc.text(splitAddress, 14, currentY);
    currentY += (splitAddress.length * 5);
  } else {
    doc.text("Location not provided", 14, currentY);
    currentY += 5;
  }

  currentY += 20;

  let desc = tx.description;
  if (tx.description === "Razorpay recharge") {
    desc = "Wallet Recharge";
  } else if (tx.description.includes(" - ")) {
    desc = tx.description.split(" - ")[0];
  }
  const amountStr = "Rs " + Math.round(tx.amount_paise / 100).toString();

  autoTable(doc, {
    startY: currentY,
    head: [[
      { content: "Item", styles: { halign: 'left' } },
      { content: "Total", styles: { halign: 'right' } }
    ]],
    body: [
      [desc, amountStr]
    ],
    theme: 'plain',
    headStyles: {
      fillColor: false,
      textColor: 0,
      fontStyle: 'normal',
      fontSize: 10,
      lineWidth: 0
    },
    bodyStyles: {
      textColor: 0,
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'right' }
    },
    didDrawPage: function () {

    },
    willDrawCell: function (data) {

      const { doc, cell, row, section } = data;
      if (section === 'head') {
        doc.setLineWidth(0.5);
        doc.setDrawColor(0);

        doc.line(14, cell.y, pageWidth - 14, cell.y);

        doc.line(14, cell.y + cell.height, pageWidth - 14, cell.y + cell.height);
      }
      if (section === 'body' && row.index === 0) {

        doc.setLineWidth(0.5);
        doc.setDrawColor(0);
        doc.line(14, cell.y + cell.height, pageWidth - 14, cell.y + cell.height);
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(0);

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", pageWidth - 60, finalY);
  doc.text(amountStr, pageWidth - 14, finalY, { align: "right" });

  finalY += 8;

  doc.text("Tax (0%)", pageWidth - 60, finalY);
  doc.text("Rs 0", pageWidth - 14, finalY, { align: "right" });

  finalY += 5;

  doc.setLineWidth(0.5);
  doc.line(pageWidth - 65, finalY, pageWidth - 14, finalY);

  finalY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Total", pageWidth - 60, finalY);
  doc.text(amountStr, pageWidth - 14, finalY, { align: "right" });

  let bottomY = finalY + 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT METHOD", 14, bottomY);

  bottomY += 6;
  doc.setFont("helvetica", "normal");
  doc.text("Razorpay", 14, bottomY);

  bottomY += 6;
  doc.text("Paid To: Techgen Cyber Solution Pvt. Ltd.", 14, bottomY);

  bottomY += 6;
  doc.text(`Transaction ID: ${tx.id}`, 14, bottomY);

  bottomY += 6;
  doc.text(`Payment Date: ${format(new Date(tx.created_at), "dd MMMM yyyy")}`, 14, bottomY);

  bottomY += 20;
  doc.setFontSize(12);
  doc.text("Thank you for your business!", 14, bottomY);

  const signY = pageHeight - 50;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("This is a E-invoice. No sign needed.", pageWidth - 14, signY, { align: "right" });

  doc.setDrawColor(0, 200, 83);
  doc.setLineWidth(1);
  const signTextWidth = doc.getTextWidth("This is a E-invoice. No sign needed.");
  doc.line(pageWidth - 14 - signTextWidth - 5, signY + 3, pageWidth - 14 + 5, signY + 3);

  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.text("Authorized Signed", pageWidth - 14 - (signTextWidth / 2), signY + 8, { align: "center" });

  doc.setFillColor(0, 200, 83);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  try {
    const phoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    const mapPinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

    const [phonePng, mapPng] = await Promise.all([
      svgToPngDataUrl(phoneSvg, 64, 64),
      svgToPngDataUrl(mapPinSvg, 64, 64)
    ]);

    doc.addImage(phonePng, 'PNG', 34, pageHeight - 13, 4, 4);
    doc.addImage(mapPng, 'PNG', 104, pageHeight - 13, 4, 4);
  } catch (e) {
    console.warn("Failed to generate footer icons", e);
  }

  doc.text("+91 7003798750", 40, pageHeight - 10);

  doc.text("27/1 Bidhan Nagar Road, kolkata- 700067", 110, pageHeight - 10);

  const fileDate = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
  const userId = user?.id || "unknown";
  doc.save(`Invoice_${userId}_${fileDate}.pdf`);
}
