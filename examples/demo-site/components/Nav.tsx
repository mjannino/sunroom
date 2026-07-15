import Link from "next/link";
import sunroom from "@/sunroom.config";

export default async function Nav() {
  const pages = await sunroom.getPages();

  return (
    <nav>
      <ul>
        {pages.map((page) => (
          <li key={page.slug}>
            <Link href={page.slug === "" ? "/" : `/${page.slug}`}>
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
