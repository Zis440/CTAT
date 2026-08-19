import { useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "sonner";

export interface BulkExportConfig<T> {
  pdfHeader?: string;
  columns: { label: string; key: keyof T | ((item: T) => string) }[];
}

export function useBulkSelection<T extends { id: string }>() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, T>>(new Map());

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectedItems(new Map());
    }
  }, [isSelectionMode]);

  const toggleItemSelection = useCallback((item: T) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback((items: T[], _isAllSelected?: boolean) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const allSelected = items.every((item) => next.has(item.id));
      if (allSelected) {
        items.forEach((item) => next.delete(item.id));
      } else {
        items.forEach((item) => next.set(item.id, item));
      }
      return next;
    });
  }, []);

  const isItemSelected = useCallback(
    (id: string) => selectedItems.has(id),
    [selectedItems]
  );

  const getSelectedArray = useCallback(() => {
    return Array.from(selectedItems.values());
  }, [selectedItems]);

  const exportSelectedToPDF = useCallback(async (config: BulkExportConfig<T>) => {
    const items = getSelectedArray();
    if (items.length === 0) {
      toast.error("No items selected for export.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 20;

    try {
      const response = await fetch('/psyichub-report-logo.png');
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      // The report logo is rectangular (approx 2.5:1.38 ratio)
      doc.addImage(base64Data, 'PNG', 14, 12, 32, 17); 
      // Skip the "Psyichub" text since the logo already contains the full brand text
      currentY = 38;
    } catch (e) {
      console.warn("Failed to load logo for PDF", e);
      doc.setFontSize(14);
      doc.setTextColor("#238b40");
      doc.text("Psyichub", 14, 22);
      currentY = 35;
    }

    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const headerText = config.pdfHeader || "Exported Data";
    doc.text(headerText, 14, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "PPpp")}`, 14, currentY);
    currentY += 10;

    const head = [config.columns.map(c => c.label)];
    const body = items.map(item => 
      config.columns.map(col => 
        typeof col.key === "function" ? col.key(item) : String(item[col.key] ?? "")
      )
    );

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      styles: { cellPadding: 3, fontSize: 9 },
      headStyles: { fillColor: "#238b40" },
    });

    doc.save(`${headerText.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("PDF Exported Successfully");
    toggleSelectionMode();
  }, [getSelectedArray, toggleSelectionMode]);

  const exportSelectedToExcel = useCallback((config: BulkExportConfig<T>, sheetName: string = "Data") => {
    const items = getSelectedArray();
    if (items.length === 0) {
      toast.error("No items selected for export.");
      return;
    }

    const exportData = items.map(item => {
      const row: Record<string, string> = {};
      config.columns.forEach(col => {
        row[col.label] = typeof col.key === "function" ? col.key(item) : String(item[col.key] ?? "");
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const wscols = config.columns.map(() => ({ wch: 20 }));
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, `${sheetName.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Excel Exported Successfully");
    toggleSelectionMode();
  }, [getSelectedArray, toggleSelectionMode]);

  return {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    getSelectedArray,
    exportSelectedToPDF,
    exportSelectedToExcel,
  };
}
