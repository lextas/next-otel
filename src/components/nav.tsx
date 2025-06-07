import Link from "next/link";

export const Nav = () => {
  return (
    <nav className="p-5 flex gap-x-4 bg-gray-50 border-b border-gray-200">
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
};
