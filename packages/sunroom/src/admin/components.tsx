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
        <a
          href="/api/sunroom/auth/login"
          className="sr-btn sr-btn-primary sr-btn-lg"
        >
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
      <div className="sr-top">
        <span className="sr-brand">
          <span className="sr-sun" />
          Sunroom
        </span>
        <span className="sr-top-spacer" />
        <span className="sr-user">{session.email}</span>
        <form
          method="post"
          action="/api/sunroom/auth/logout"
          style={{ margin: 0 }}
        >
          <button type="submit" className="sr-btn">
            Sign out
          </button>
        </form>
      </div>
      <div className="sr-body">{children}</div>
    </AdminFrame>
  );
}
