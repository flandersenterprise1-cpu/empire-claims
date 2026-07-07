/**
 * Owner notifications for important events (new claim, new website inquiry).
 *
 * By default this logs to the server console. To receive real notifications,
 * wire this up to an email/SMS provider (e.g. Resend, SendGrid, Twilio) using
 * environment variables — the call sites stay unchanged.
 */
export async function notifyOwner(opts: {
  title: string;
  content: string;
}): Promise<boolean> {
  console.log(`[Notify] ${opts.title} — ${opts.content}`);
  return true;
}
