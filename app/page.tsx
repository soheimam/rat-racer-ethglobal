import Link from "next/link";

export default function Home() {
  return (
    <div>
      <Link href="/my-rats">
        <button>My Rats</button>
      </Link>
      <Link href="/shop">
        <button>Shop</button>
      </Link>
      <Link href="/races">
        <button>Races</button>
      </Link>
    </div>
  );
}
