'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toEnglishDigits } from '@/lib/format';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxScanTimeMs?: number;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 2,
  maxScanTimeMs = 150,
}: BarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement | null;
      const isTargetInput = target && (
        target.tagName.toLowerCase() === 'textarea' ||
        target.isContentEditable ||
        (target.tagName.toLowerCase() === 'input' && !(target as HTMLInputElement).dataset.barcodeInput)
      );

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;

      // Enter key indicates end of barcode transmission from scanner
      if (e.key === 'Enter') {
        const rawBuffer = bufferRef.current.trim();
        if (rawBuffer.length >= minLength) {
          const normalized = toEnglishDigits(rawBuffer);
          bufferRef.current = '';
          e.preventDefault();
          e.stopPropagation();
          onScan(normalized);
          return;
        }
        bufferRef.current = '';
        return;
      }

      // If user is typing manually in a regular text/textarea input at slow human typing speed, do not intercept
      if (isTargetInput && timeDiff > maxScanTimeMs) {
        bufferRef.current = '';
        return;
      }

      // Reset buffer if delay between keystrokes exceeds maxScanTimeMs (human typing vs hardware scanner)
      if (timeDiff > maxScanTimeMs) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      // Append printable single character
      if (e.key && e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // Cleanup buffer after inactive timeout
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, maxScanTimeMs * 2);
    },
    [enabled, minLength, maxScanTimeMs, onScan]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, handleKeyDown]);

  return { isEnabled: enabled };
}
