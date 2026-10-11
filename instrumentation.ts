export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSmsScheduler } = await import('./lib/sms-scheduler');
    startSmsScheduler();
  }
}
