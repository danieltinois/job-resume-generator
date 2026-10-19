const mailpitUrl = process.env['E2E_MAILPIT_URL'] ?? 'http://localhost:8025';

interface MessageSummary {
  ID: string;
  To: { Address: string }[];
}

/**
 * Returns the first app link in the newest email sent to `email`, polling
 * Mailpit until it arrives: the backend sends mail after the transaction commits.
 */
export async function latestLink(email: string, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = (await (await fetch(`${mailpitUrl}/api/v1/messages`)).json()) as { messages: MessageSummary[] };
    const summary = list.messages.find((message) => message.To.some((to) => to.Address === email));
    if (summary) {
      const message = (await (await fetch(`${mailpitUrl}/api/v1/message/${summary.ID}`)).json()) as { Text: string };
      const link = message.Text.match(/https?:\/\/\S+/)?.[0];
      if (!link) {
        throw new Error(`No link in the email sent to ${email}`);
      }
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email for ${email} within ${timeoutMs} ms`);
}
