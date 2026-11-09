"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <main className="admin-login">
      <h1 className="heading-4">Вхід в адмінку</h1>
      <form className="form" action={action}>
        <div className="field">
          <label className="title-4" htmlFor="email">Пошта</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label className="title-4" htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && <p className="error caption-4" role="alert">{state.error}</p>}
        <button className="btn btn-primary button-md" type="submit" disabled={pending}>
          {pending ? "Входимо" : "Увійти"}
        </button>
      </form>
    </main>
  );
}
