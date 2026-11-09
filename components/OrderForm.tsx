"use client";

import { useState, type FormEvent } from "react";
import { COLORS, validateLead, type LeadErrors } from "@/lib/leads";

type Props = { color: string; onColorChange: (label: string) => void };

export default function OrderForm({ color, onColorChange }: Props) {
  const [errors, setErrors] = useState<LeadErrors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentName, setSentName] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries());
    const payload = { ...fields, color };
    setFormError("");

    const result = validateLead(payload);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSending(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setSentName(result.lead.name);
        form.reset();
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        setFormError(data.message ?? "Замовлення не надіслано. Спробуйте ще раз.");
      }
    } catch {
      setFormError("Немає зв'язку із сервером. Перевірте інтернет і спробуйте ще раз.");
    } finally {
      setSending(false);
    }
  }

  if (sentName) {
    return (
      <div className="form-done" role="status">
        <p className="heading-5">Дякуємо, {sentName}. Замовлення прийнято.</p>
        <p className="body-3 muted">Колір: {color}. Менеджер зателефонує, щоб підтвердити доставку.</p>
        <button className="btn btn-secondary button-md" type="button" onClick={() => setSentName("")}>
          Оформити ще одне
        </button>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset className="field color-field">
        <legend className="title-4">Колір</legend>
        <div className="swatches">
          {COLORS.map((item) => (
            <label key={item.id} className="swatch-option">
              <input
                type="radio"
                name="colorChoice"
                checked={color === item.label}
                onChange={() => onColorChange(item.label)}
              />
              <span className="dot" style={{ background: item.swatch }} aria-hidden="true" />
              <span className="body-6">{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="title-4" htmlFor="name">ПІБ</label>
        <input id="name" name="name" type="text" autoComplete="name" placeholder="Шевченко Олена Петрівна" aria-invalid={!!errors.name} aria-describedby="name-error" />
        {errors.name && <p className="error caption-4" id="name-error">{errors.name}</p>}
      </div>

      <div className="field">
        <label className="title-4" htmlFor="phone">Телефон</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0671234567" aria-invalid={!!errors.phone} aria-describedby="phone-error" />
        {errors.phone && <p className="error caption-4" id="phone-error">{errors.phone}</p>}
      </div>

      <div className="field">
        <label className="title-4" htmlFor="comment">Нова пошта</label>
        <input id="comment" name="comment" type="text" autoComplete="off" placeholder="Київ, відділення 12" aria-invalid={!!errors.comment} aria-describedby="comment-error" />
        {errors.comment && <p className="error caption-4" id="comment-error">{errors.comment}</p>}
      </div>

      <input className="hp" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {errors.color && <p className="error caption-4">{errors.color}</p>}
      {formError && <p className="error caption-4" role="alert">{formError}</p>}

      <button className="btn btn-primary button-md" type="submit" disabled={sending}>
        {sending ? "Надсилаємо" : "Замовити"}
      </button>
    </form>
  );
}
