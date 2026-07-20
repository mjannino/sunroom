import "server-only";
import type { ReactElement, ReactNode } from "react";
import { ADMIN_CSS } from "./admin-css.js";
import { AuthConfigError } from "./config.js";
import { getSession } from "./session-server.js";

function AdminFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="sr-admin">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      {children}
    </div>
  );
}

export function SignInScreen(): ReactElement {
  return (
    <AdminFrame>
      <main className="sr-center">
        <h1>Sunroom</h1>
        <p>Sign in to edit this site.</p>
        <a href="/api/sunroom/auth/login" className="sr-signin-btn">
          Sign in with Google
        </a>
      </main>
    </AdminFrame>
  );
}

export function ConfigErrorScreen({
  message,
}: {
  message: string;
}): ReactElement {
  return (
    <AdminFrame>
      <main className="sr-center wide">
        <h1>Sunroom is misconfigured</h1>
        <p>{message}</p>
      </main>
    </AdminFrame>
  );
}

export async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthConfigError) {
      return <ConfigErrorScreen message={err.message} />;
    }
    throw err;
  }
  if (!session) return <SignInScreen />;

  return (
    <AdminFrame>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <strong>Sunroom</strong>
        <span style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span>Signed in as {session.email}</span>
          <form
            method="post"
            action="/api/sunroom/auth/logout"
            style={{ margin: 0 }}
          >
            <button type="submit">Sign out</button>
          </form>
        </span>
      </header>
      <main style={{ padding: "1.5rem" }}>{children}</main>
    </AdminFrame>
  );
}
