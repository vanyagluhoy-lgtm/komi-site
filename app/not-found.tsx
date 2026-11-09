import Link from "next/link";

export default function NotFound() {
  return (
    <main className="admin-login">
      <h1 className="heading-4">Такої сторінки немає</h1>
      <p className="body-3 muted">Адреса не існує або заявку вже видалено.</p>
      <Link className="btn btn-primary button-md" href="/">На головну</Link>
    </main>
  );
}
