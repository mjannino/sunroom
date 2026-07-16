import "server-only";
import type { ReactElement, ReactNode } from "react";
import { getSession } from "./session-server.js";

export function SignInScreen(): ReactElement {
  return (
    <main
      style={{
        fontFamily: "system-ui",
        maxWidth: 420,
        margin: "10vh auto",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1>Sunroom</h1>
      <p>Sign in to edit this site.</p>
      <a
        href="/api/sunroom/auth/login"
        style={{
          display: "inline-block",
          padding: "0.6rem 1.2rem",
          border: "1px solid #ccc",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Sign in with Google
      </a>
    </main>
  );
}

export function AdminPage(): ReactElement {
  return (
    <section>
      <p>Your content will appear here.</p>
    </section>
  );
}

export async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const session = await getSession();
  if (!session) return <SignInScreen />;

  return (
    <div style={{ fontFamily: "system-ui" }}>
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
    </div>
  );
}
