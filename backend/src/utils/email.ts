import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT) || 587, auth: { user, pass } });
}

export async function sendEmail(options: { to: string | string[]; subject: string; text?: string; html?: string }): Promise<void> {
  const transport = createTransport();
  const from = process.env.EMAIL_FROM || 'GoalTrack <noreply@goaltrack.company.com>';
  const toList = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  if (!transport) {
    console.log('\n[EMAIL - CONSOLE MODE]\nFrom   :', from, '\nTo     :', toList, '\nSubject:', options.subject);
    if (options.text) console.log('Body   :\n', options.text);
    return;
  }
  await transport.sendMail({ from, to: toList, subject: options.subject, text: options.text, html: options.html });
}

export async function sendGoalSubmittedEmail(managerEmail: string, employeeName: string, cycleId: string): Promise<void> {
  await sendEmail({ to: managerEmail, subject: `GoalTrack: ${employeeName} has submitted goals for your approval`, text: `Hi,\n\n${employeeName} has submitted their goal sheet (Cycle: ${cycleId}) and is awaiting your approval.\n\nPlease log in to GoalTrack to review.\n\nRegards,\nGoalTrack` });
}

export async function sendGoalApprovedEmail(employeeEmail: string, cycleName: string): Promise<void> {
  await sendEmail({ to: employeeEmail, subject: `GoalTrack: Your goals have been approved`, text: `Hi,\n\nYour goal sheet for cycle "${cycleName}" has been approved and locked. You can now log quarterly achievements.\n\nRegards,\nGoalTrack` });
}

export async function sendGoalReturnedEmail(employeeEmail: string, cycleName: string): Promise<void> {
  await sendEmail({ to: employeeEmail, subject: `GoalTrack: Your goals have been returned for rework`, text: `Hi,\n\nYour goal sheet for cycle "${cycleName}" has been returned by your manager for rework. Please revise and resubmit.\n\nRegards,\nGoalTrack` });
}

export async function sendEscalationEmail(to: string | string[], subject: string, body: string): Promise<void> {
  await sendEmail({ to, subject, text: body });
}

export async function sendCheckInReminderEmail(employeeEmail: string, quarter: string): Promise<void> {
  await sendEmail({ to: employeeEmail, subject: `GoalTrack: ${quarter} Check-in reminder`, text: `Hi,\n\nThis is a reminder that your ${quarter} check-in is pending.\n\nRegards,\nGoalTrack` });
}
