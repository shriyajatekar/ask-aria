import { google } from "googleapis";

import { getGoogleOAuth2Client } from "./tokens";

function encodeRawMessage(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SendGmailMessageInput {
  to: string[];
  subject: string;
  body: string;
}

export interface SendGmailMessageResult {
  messageId: string;
  threadId?: string;
}

export async function sendGmailMessage(
  input: SendGmailMessageInput,
): Promise<SendGmailMessageResult> {
  const auth = await getGoogleOAuth2Client();
  if (!auth) {
    throw new Error("Gmail is not connected");
  }

  const toHeader = input.to.map((e) => e.trim()).filter(Boolean).join(", ");
  if (!toHeader) {
    throw new Error("At least one recipient is required");
  }

  const subject = input.subject.replace(/\r?\n/g, " ").trim();
  const body = input.body.replace(/\r\n/g, "\n");
  const rawMessage = [
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const gmail = google.gmail({ version: "v1", auth });
  const sent = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeRawMessage(rawMessage),
    },
  });

  const messageId = sent.data.id;
  if (!messageId) {
    throw new Error("Gmail did not return a message id");
  }

  return {
    messageId,
    threadId: sent.data.threadId ?? undefined,
  };
}

export function gmailSentMessageUrl(
  result: Pick<SendGmailMessageResult, "messageId" | "threadId">,
): string | null {
  if (result.threadId) {
    return `https://mail.google.com/mail/u/0/#all/${result.threadId}`;
  }
  if (result.messageId) {
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid%3A${encodeURIComponent(result.messageId)}`;
  }
  return null;
}
