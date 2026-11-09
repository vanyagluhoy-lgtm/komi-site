import Link from "next/link";
import { formatTime, isStatus, statusLabel, STATUSES, type Lead } from "@/lib/leads";
import { createSessionClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const instant = false;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : null;

  const supabase = await createSessionClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (filter) query = query.eq("status", filter);
  const { data, error } = await query;
  const leads = (data ?? []) as Lead[];

  return (
    <main className="admin-page">
      <header className="admin-head">
        <h1 className="heading-4">Заявки</h1>
        <form action={signOut}>
          <button className="btn btn-secondary button-sm" type="submit">Вийти</button>
        </form>
      </header>

      <nav className="filters body-5" aria-label="Фільтр за статусом">
        <Link href="/admin" aria-current={filter ? undefined : "page"}>Усі</Link>
        {STATUSES.map((item) => (
          <Link key={item.id} href={`/admin?status=${item.id}`} aria-current={filter === item.id ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      {error && <p className="error body-6" role="alert">Не вдалося завантажити заявки. Оновіть сторінку.</p>}

      {!error && leads.length === 0 && (
        <div className="admin-empty">
          <p className="title-2">{filter ? "У цьому статусі заявок немає" : "Заявок поки немає"}</p>
          <p className="body-6">Нові заявки з сайту з'являться тут угорі списку.</p>
        </div>
      )}

      <ul className="lead-list">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link className="lead-row" href={`/admin/${lead.id}`}>
              <span className="title-3">{lead.name}</span>
              <span className="body-6 muted">{lead.phone}</span>
              <span className="body-6 muted">{lead.color}</span>
              <span className="body-6 muted num">{formatTime(lead.created_at)}</span>
              <span className={`status caption-3 status-${lead.status}`}>{statusLabel(lead.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
