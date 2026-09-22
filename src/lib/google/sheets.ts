import { google } from "googleapis";

import { getGoogleOAuth2Client } from "./tokens";
import type { SpreadsheetBuildResult } from "./sheet-content";

export async function createSpreadsheetFromData(
  title: string,
  data: SpreadsheetBuildResult,
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const auth = await getGoogleOAuth2Client();
  if (!auth) {
    throw new Error("Google Workspace is not connected");
  }

  const sheets = google.sheets({ version: "v4", auth });
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: "Export" } }],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Google Sheets did not return a spreadsheet id");
  }

  const values = [data.headers, ...data.rows];
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Export!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}
