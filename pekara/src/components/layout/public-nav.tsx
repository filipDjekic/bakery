import Link from "next/link";

const navigation = [
  {
    label: "Početna",
    href: "/",
  },
  {
    label: "Proizvodi",
    href: "/products",
  },
];

export function PublicNav() {
  return (
    <nav aria-label="Glavna navigacija" className="hidden md:block">
      <ul className="flex items-center gap-6">
        {navigation.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-4"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
