'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PrinterStatus {
  available: boolean;
  name: string | null;
  checking: boolean;
}

export function usePrinter() {
  const [status, setStatus] = useState<PrinterStatus>({
    available: false,
    name: null,
    checking: true,
  });

  const checkPrinter = useCallback(async () => {
    setStatus((s) => ({ ...s, checking: true }));
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        setStatus({ available: false, name: null, checking: false });
        return;
      }

      const hasPrint = typeof window.print === 'function';

      let printerName: string | null = null;
      let detected = false;

      // Try modern Web Printing API (if available in the browser)
      const printingAPI = (navigator as any).printing;
      if (printingAPI && typeof printingAPI.getPrinters === 'function') {
        try {
          const printers = await printingAPI.getPrinters();
          if (printers && printers.length > 0) {
            const active = printers.find((p: any) => p.isActive) || printers[0];
            printerName = active?.name || 'پرینتر پیش‌فرض';
            detected = true;
          }
        } catch {
          // API not supported or blocked
        }
      }

      // Fallback: check navigator.plugins for print-related plugins
      if (!detected && hasPrint) {
        const plugins = navigator.plugins;
        if (plugins && plugins.length > 0) {
          for (let i = 0; i < plugins.length; i++) {
            const plugin = plugins[i];
            if (
              plugin.name &&
              (plugin.name.toLowerCase().includes('print') ||
                plugin.name.toLowerCase().includes('pdf'))
            ) {
              printerName = plugin.name;
              detected = true;
              break;
            }
          }
        }
      }

      // Final fallback: if window.print exists, assume a printer may be connected
      // but mark as "unknown" rather than definitively connected
      if (!detected && hasPrint) {
        // Check if there's a default printer by attempting a mock check
        // Browsers don't expose this, so we check for print capability
        detected = true;
        printerName = null; // unknown name
      }

      setStatus({
        available: detected,
        name: printerName,
        checking: false,
      });
    } catch {
      setStatus({ available: false, name: null, checking: false });
    }
  }, []);

  useEffect(() => {
    checkPrinter();
  }, [checkPrinter]);

  return { status, checkPrinter };
}

export function printInvoice(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to render before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Close the window after print dialog (some browsers)
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 500);
    }, 300);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 1000);

  return true;
}
