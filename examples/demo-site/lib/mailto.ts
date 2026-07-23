export interface ContactFields {
  name: string;
  email: string;
  project: string;
  musicLink?: string;
  songCount?: string;
  timing?: string;
  message?: string;
}

export function buildMailtoHref(to: string, f: ContactFields): string {
  const lines = [
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    `Band / project: ${f.project}`,
    f.musicLink ? `Music link: ${f.musicLink}` : "",
    f.songCount ? `Songs: ${f.songCount}` : "",
    f.timing ? `Timing: ${f.timing}` : "",
    f.message ? `\n${f.message}` : "",
  ].filter(Boolean);

  const params = new URLSearchParams({
    subject: `New inquiry — ${f.project}`,
    body: lines.join("\n"),
  });
  return `mailto:${to}?${params.toString()}`;
}
