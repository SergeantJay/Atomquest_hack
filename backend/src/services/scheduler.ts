import cron from 'node-cron';
import { runEscalationCheck } from './escalation';

export function initScheduler(): void {
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Running daily escalation check at', new Date().toISOString());
    try {
      const result = await runEscalationCheck();
      console.log(`[SCHEDULER] Done. Rules: ${result.rulesRan}, Triggered: ${result.escalationsTriggered}`);
    } catch (err) {
      console.error('[SCHEDULER] Escalation check failed:', err);
    }
  });
  console.log('[SCHEDULER] Daily escalation check scheduled for 09:00 AM.');
}
