import Link from "next/link";

export default function MyRatsPage() {
    return (
        <div>
            <Link href="/">
                <button>Back</button>
            </Link>
            <h1>My Rats</h1>
            <p>Your rats will appear here</p>
        </div>
    );
}

