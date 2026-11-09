import Link from "next/link";
import { notFound } from "next/navigation";
import { formatTime, statusLabel, STATUSES, type Lead } from "@/lib/leads";
import { createSessionClient } from "@/lib/supabase/server";
import { updateStatus } from "../actions";

export const instant = false;

export default async function LeadPage({ params }: PageProps<"/admin/[id]">) {
  const { id } = await params;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const lead = data as Lead;

  return (
    <main className="admin-page admin-detail">
      <Link className="body-5 muted back" href="/admin">Усі заявки</Link>
      <header className="admin-head">
        <h1 className="heading-4">{lead.name}</h1>
        <span className={`status caption-3 status-${lead.status}`}>{statusLabel(lead.status)}</span>
      </header>

      <dl className="lead-data">
        <dt className="caption-2 muted">Телефон</dt>
        <dd className="body-3">{lead.phone}</dd>
        <dt className="caption-2 muted">Колір</dt>
        <dd className="body-3">{lead.color}</dd>
        <dt className="caption-2 muted">Нова пошта</dt>
        <dd className="body-3 pre">{lead.comment}</dd>
        <dt className="caption-2 muted">Створено</dt>
        <dd className="body-3 num">{formatTime(lead.created_at)}</dd>
      </dl>

      <form className="status-form" action={updateStatus}>
        <input type="hidden" name="id" value={lead.id} />
        <div className="field">
          <label className="title-4" htmlFor="status">Статус</label>
          <select id="status" name="status" defaultValue={lead.status} key={lead.status}>
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary button-md" type="submit">Зберегти статус</button>
      </form>
    </main>
  );
}
