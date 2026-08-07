import "server-only";
import type { ReactElement, ReactNode } from "react";
import { ADMIN_CSS } from "./admin-css.js";
import { AuthConfigError } from "./config.js";
import { getSession } from "./session-server.js";
import { getStore } from "../store/singleton.js";
import { resolveConfig } from "../core/registry.js";
import type { Settings } from "../store/types.js";

function AdminFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="sr-admin">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      {children}
    </div>
  );
}

async function siteIdentity(): Promise<Settings["site"]> {
  try {
    const s = await getStore(resolveConfig({ sections: {} }));
    return s.getSettings().site;
  } catch {
    return undefined;
  }
}

export function SignInScreen({
  site,
}: {
  site?: Settings["site"];
}): ReactElement {
  return (
    <AdminFrame>
      <main className="sr-center">
        <h1>{site?.name || "Sunroom"}</h1>
        <p className="sr-madewith">made with Sunroom</p>
        <p>Sign in to edit this site.</p>
        <a href="/api/sunroom/auth/login" className="sr-btn sr-btn-google">
          <span className="sr-g" aria-hidden="true">
            G
          </span>
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
  const site = await siteIdentity();

  let session;
  try {
    session = await getSession();
  } catch (err) {
    if (err instanceof AuthConfigError) {
      return <ConfigErrorScreen message={err.message} />;
    }
    throw err;
  }
  if (!session) return <SignInScreen site={site} />;

  return (
    <AdminFrame>
      <div className="sr-top">
        <span className="sr-brand">
          <span className="sr-sun" />
          Sunroom
          {site?.name ? <span className="sr-sitename">{site.name}</span> : null}
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
