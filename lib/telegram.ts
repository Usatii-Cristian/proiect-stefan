import "server-only";
import { createHmac } from "node:crypto";
import { env } from "./env";

const BASE = () => `https://api.telegram.org/bot${env.telegram.botToken}`;

export type InlineButton = { text: string; callback_data: string };

async function tgCall<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  if (!env.telegram.botToken) return null;
  try {
    const res = await fetch(`${BASE()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data?.ok ? (data.result as T) : null;
  } catch {
    return null;
  }
}

export function sendMessage(
  chatId: string | number,
  text: string,
  keyboard?: InlineButton[][],
) {
  return tgCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
    disable_web_page_preview: true,
  });
}

export function editMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  keyboard?: InlineButton[][],
) {
  return tgCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

/** Răspuns instant la callback (ca botul să nu pară lent). */
export function answerCallback(callbackId: string, text?: string) {
  return tgCall("answerCallbackQuery", {
    callback_query_id: callbackId,
    text,
    cache_time: 0,
  });
}

export function getMe() {
  return tgCall<{ username: string; first_name: string }>("getMe", {});
}

export function setWebhook(url: string) {
  return tgCall("setWebhook", {
    url,
    secret_token: env.telegram.webhookSecret,
    allowed_updates: ["message", "callback_query"],
  });
}

export function deleteWebhook() {
  return tgCall("deleteWebhook", {});
}

/** Descarcă un fișier Telegram (ex. voice) ca ArrayBuffer. */
export async function getFileBuffer(fileId: string): Promise<ArrayBuffer | null> {
  const file = await tgCall<{ file_path: string }>("getFile", { file_id: fileId });
  if (!file?.file_path) return null;
  const res = await fetch(
    `https://api.telegram.org/file/bot${env.telegram.botToken}/${file.file_path}`,
  );
  if (!res.ok) return null;
  return res.arrayBuffer();
}

/** Token de linkare semnat (userId + HMAC trunchiat). */
export function signLinkToken(userId: string): string {
  const sig = createHmac("sha256", env.sessionSecret)
    .update(userId)
    .digest("base64url")
    .slice(0, 16);
  return `${userId}.${sig}`;
}

export function verifyLinkToken(token: string): string | null {
  const [userId, sig] = token.split(".");
  if (!userId || !sig) return null;
  const expected = createHmac("sha256", env.sessionSecret)
    .update(userId)
    .digest("base64url")
    .slice(0, 16);
  return sig === expected ? userId : null;
}

/** Meniul principal (butoane). */
export function mainMenu(): InlineButton[][] {
  return [
    [
      { text: "📅 Azi", callback_data: "TODAY" },
      { text: "📆 Mâine", callback_data: "TOMORROW" },
    ],
    [
      { text: "🗓 Săptămâna", callback_data: "WEEK" },
      { text: "➕ Adaugă", callback_data: "ADD" },
    ],
    [
      { text: "🔍 Caută client", callback_data: "SEARCH" },
      { text: "🎤 Voce", callback_data: "VOICE" },
    ],
    [{ text: "⚙️ Setări", callback_data: "SETTINGS" }],
  ];
}

/** Butoane per programare. */
export function apptButtons(id: string): InlineButton[][] {
  return [
    [
      { text: "✅ Confirmă", callback_data: `ST_CONFIRM:${id}` },
      { text: "✔️ Finalizat", callback_data: `ST_DONE:${id}` },
    ],
    [
      { text: "❌ Anulează", callback_data: `ST_CANCEL:${id}` },
      { text: "🚫 No-show", callback_data: `ST_NOSHOW:${id}` },
    ],
  ];
}
