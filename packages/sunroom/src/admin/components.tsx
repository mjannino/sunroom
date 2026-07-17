import type { ReactElement, ReactNode } from "react";
import { AuthConfigError } from "./config.js";
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

export function ConfigErrorScreen({
  message,
}: {
  message: string;
}): ReactElement {
  return (
    <main
      style={{
        fontFamily: "system-ui",
        maxWidth: 560,
        margin: "10vh auto",
        padding: "2rem",
        border: "1px solid #e5b8b8",
        borderRadius: 8,
        background: "#fff5f5",
      }}
    >
      <h1>Sunroom is misconfigured</h1>
      <p>{message}</p>
    </main>
  );
}

export async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  // Imported lazily: `server-only` throws unconditionally at module-eval
  // time outside an RSC bundler (by design, to catch accidental
  // client-component imports at build time). A static top-level import
  // would break plain-Node ESM consumers of the `sunroom` barrel (e.g.
  // Node scripts that only need `GitStore`) even though it resolves fine
  // inside Next's own bundler. `SignInScreen`/`ConfigErrorScreen` are pure
  // presentational and don't need the guard. See the identical fix in
  // session-server.ts / handlers.ts.
  await import("server-only");
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
