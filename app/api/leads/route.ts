import { NextResponse } from "next/server";
import { formatTime, statusLabel, validateLead, type Lead } from "@/lib/leads";
import { createServiceClient } from "@/lib/supabase/server";

async function notifyTelegram(lead: Lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram env is not configured");

  const text = [
    "Нове замовлення: костюм Комі",
    "",
    `ПІБ: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    `Колір: ${lead.color}`,
    `Нова пошта: ${lead.comment}`,
    `Час: ${formatTime(lead.created_at)}`,
    `Статус: ${statusLabel(lead.status)}`,
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error(`Telegram responded ${response.status}`);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Некоректний запит." }, { status: 400 });
  }

  // Приховане поле: його заповнюють лише боти
  if ((body as Record<string, unknown>).website) return NextResponse.json({ ok: true });

  const result = validateLead(body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  let lead: Lead;
  try {
    const { data, error } = await createServiceClient().from("leads").insert(result.lead).select().single();
    if (error) throw error;
    lead = data as Lead;
  } catch (error) {
    console.error("Lead insert failed", error);
    return NextResponse.json({ message: "Замовлення не збережено. Спробуйте ще раз за хвилину." }, { status: 503 });
  }

  // Заявка вже в базі, тому збій Telegram не показуємо клієнту як помилку
  try {
    await notifyTelegram(lead);
  } catch (error) {
    console.error("Telegram notification failed", error);
  }

  return NextResponse.json({ ok: true });
}
