import { google } from "googleapis";

import { getGoogleOAuth2Client } from "./tokens";

export async function createDocFromReportContent(
  title: string,
  content: string,
): Promise<{ documentId: string; docUrl: string }> {
  const auth = await getGoogleOAuth2Client();
  if (!auth) {
    throw new Error("Google Workspace is not connected");
  }

  const docs = google.docs({ version: "v1", auth });
  const created = await docs.documents.create({
    requestBody: { title },
  });
  const documentId = created.data.documentId;
  if (!documentId) {
    throw new Error("Google Docs did not return a document id");
  }

  if (content.trim()) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
  return { documentId, docUrl };
}
