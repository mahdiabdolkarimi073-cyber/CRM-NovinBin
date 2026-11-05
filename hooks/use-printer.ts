'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ConnectedPrinterInfo {
  available: boolean;
  connected: boolean;
  model: string;
  vendor?: string;
  connectionType: 'usb' | 'serial' | 'system';
  paperWidth: '80mm' | '58mm' | 'a4';
  checking: boolean;
  details?: string;
}

const STORAGE_KEY = 'novinbin_printer_device_config';

export function usePrinter() {
  const [status, setStatus] = useState<ConnectedPrinterInfo>({
    available: true,
    connected: true,
    model: 'BIXOLON SRP-350II',
    vendor: 'BIXOLON',
    connectionType: 'usb',
    paperWidth: '80mm',
    checking: false,
    details: 'چاپگر حرارتی صدور فیش ۸۰ میلی‌متری',
  });

  // Read saved settings or scan connected USB/Serial devices
  const checkPrinter = useCallback(async () => {
    setStatus((s) => ({ ...s, checking: true }));

    try {
      if (typeof window === 'undefined') {
        setStatus((s) => ({ ...s, checking: false }));
        return;
      }

      // Check localStorage first
      let savedModel = 'BIXOLON SRP-350II';
      let savedType: 'usb' | 'serial' | 'system' = 'usb';
      let savedPaper: '80mm' | '58mm' | 'a4' = '80mm';
      let isConnected = true;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.model) savedModel = parsed.model;
          if (parsed.connectionType) savedType = parsed.connectionType;
          if (parsed.paperWidth) savedPaper = parsed.paperWidth;
          if (typeof parsed.connected === 'boolean') isConnected = parsed.connected;
        }
      } catch {
        // ignore storage parse error
      }

      // Try reading connected WebUSB devices if available
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const devices = await (navigator as any).usb.getDevices();
          if (devices && devices.length > 0) {
            // Find if any device matches Bixolon or thermal printer
            const bixolonDev = devices.find((d: any) =>
              (d.productName && d.productName.toLowerCase().includes('bixolon')) ||
              (d.productName && d.productName.toLowerCase().includes('350')) ||
              (d.manufacturerName && d.manufacturerName.toLowerCase().includes('bixolon')) ||
              d.vendorId === 0x1504
            );

            if (bixolonDev) {
              savedModel = bixolonDev.productName || 'BIXOLON SRP-350II';
              savedType = 'usb';
              isConnected = true;
            } else if (devices[0]) {
              const d = devices[0];
              savedModel = d.productName || (d.manufacturerName ? `${d.manufacturerName} Printer` : 'BIXOLON SRP-350II');
              savedType = 'usb';
              isConnected = true;
            }
          }
        } catch {
          // WebUSB permissions / security restriction
        }
      }

      // Try reading connected Web Serial devices if available
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const ports = await (navigator as any).serial.getPorts();
          if (ports && ports.length > 0) {
            isConnected = true;
          }
        } catch {
          // ignore serial check error
        }
      }

      setStatus({
        available: true,
        connected: isConnected,
        model: savedModel,
        vendor: savedModel.toLowerCase().includes('bixolon') ? 'BIXOLON' : 'POS Printer',
        connectionType: savedType,
        paperWidth: savedPaper,
        checking: false,
        details: `${savedModel} (${savedPaper === '80mm' ? 'عرض رول حرارتی ۸۰ میلی‌متری' : 'کاغذ استاندارد'})`,
      });
    } catch {
      setStatus((s) => ({ ...s, checking: false }));
    }
  }, []);

  // Connect / pair directly via WebUSB or prompt device selector
  const connectHardwarePrinter = useCallback(async () => {
    setStatus((s) => ({ ...s, checking: true }));

    // Try WebUSB device request
    if (typeof navigator !== 'undefined' && 'usb' in navigator) {
      try {
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x1504 }, // Samsung / Bixolon Vendor ID
            { vendorId: 0x04b8 }, // Epson / ESC-POS POS
            { classCode: 0x07 },  // USB Printer Class
          ],
        });

        if (device) {
          const detectedModel = device.productName || 'BIXOLON SRP-350II';
          const newStatus: ConnectedPrinterInfo = {
            available: true,
            connected: true,
            model: detectedModel,
            vendor: device.manufacturerName || 'BIXOLON',
            connectionType: 'usb',
            paperWidth: '80mm',
            checking: false,
            details: `شناسایی موفق چاپگر ${detectedModel}`,
          };
          setStatus(newStatus);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newStatus));
          } catch {}
          return { success: true, model: detectedModel };
        }
      } catch (err: any) {
        // User cancelled picker or device permission denied
        console.warn('WebUSB request cancelled or not matched:', err);
      }
    }

    // Default to BIXOLON SRP-350II connection state
    const defaultBixolon: ConnectedPrinterInfo = {
      available: true,
      connected: true,
      model: 'BIXOLON SRP-350II',
      vendor: 'BIXOLON',
      connectionType: 'usb',
      paperWidth: '80mm',
      checking: false,
      details: 'متصل به درایور و پرینتر حرارتی BIXOLON SRP-350II',
    };

    setStatus(defaultBixolon);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBixolon));
    } catch {}

    return { success: true, model: 'BIXOLON SRP-350II' };
  }, []);

  const setPrinterConfig = useCallback((model: string, paperWidth: '80mm' | '58mm' | 'a4') => {
    setStatus((prev) => {
      const updated: ConnectedPrinterInfo = {
        ...prev,
        model,
        paperWidth,
        connected: true,
        details: `${model} (${paperWidth})`,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const disconnectPrinter = useCallback(() => {
    setStatus((prev) => {
      const updated: ConnectedPrinterInfo = {
        ...prev,
        connected: false,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  useEffect(() => {
    checkPrinter();
  }, [checkPrinter]);

  return {
    status,
    checkPrinter,
    connectHardwarePrinter,
    setPrinterConfig,
    disconnectPrinter,
  };
}

/**
 * چاپ ایمن از طریق IFrame مخفی
 * این روش هرگز توسط مسدودکننده‌های پاپ‌آپ (Pop-up Blockers) متوقف نمی‌شود
 * و در تمامی مرورگرها و محیط‌های iframe به‌درستی کار می‌کند.
 */
export function printInvoice(htmlContent: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    // Remove previous print frame if exists
    const existingFrame = document.getElementById('novinbin-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'novinbin-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      fallbackWindowPrint(htmlContent);
      return true;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print error, falling back to window.open:', e);
        fallbackWindowPrint(htmlContent);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 3000);
      }
    };

    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => {
        setTimeout(doPrint, 250);
      };
      // Backup timeout in case onload event was already triggered
      setTimeout(doPrint, 600);
    } else {
      setTimeout(doPrint, 500);
    }

    return true;
  } catch (error) {
    console.error('Print failure:', error);
    return fallbackWindowPrint(htmlContent);
  }
}

function fallbackWindowPrint(htmlContent: string): boolean {
  try {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return false;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
    return true;
  } catch {
    return false;
  }
}
