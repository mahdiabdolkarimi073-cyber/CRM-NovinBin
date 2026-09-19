'use client';

import { useEffect } from 'react';

/**
 * Polls the meeting SMS reminder endpoint on every page, regardless of
 * whether the user is logged in or viewing the dashboard. The endpoint
 * itself no longer requires authentication, so reminders fire for any
 * visitor as long as the app is open in a browser tab somewhere.
 */
export function SmsReminderPoller() {
  useEffect(() => {
    const trigger = () => {
      fetch('/api/meetings/check-sms', { method: 'POST' }).catch(() => {});
    };

    trigger();
    const interval = setInterval(trigger, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
