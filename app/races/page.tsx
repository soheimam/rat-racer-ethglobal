import Link from "next/link";

export default function RacesPage() {
    const availableRaces = [
        { id: "demo", title: "Street Championship", status: "Ready to Race" },
        { id: "race-1", title: "Downtown Dash", status: "Ready to Race" },
        { id: "race-2", title: "Neon Night Run", status: "Ready to Race" },
    ];

    const previousRaces = [
        { id: "race-100", title: "City Sprint", winner: "Lightning Whiskers", date: "2024-01-15" },
        { id: "race-101", title: "Alley Race", winner: "Turbo Tail", date: "2024-01-14" },
        { id: "race-102", title: "Metro Madness", winner: "Shadow Dancer", date: "2024-01-13" },
    ];

    return (
        <div>
            <Link href="/">
                <button>Back</button>
            </Link>

            <h1>Available Races</h1>
            <ul>
                {availableRaces.map((race) => (
                    <li key={race.id}>
                        <Link href={`/race/${race.id}`}>
                            <button>
                                {race.title} - {race.status}
                            </button>
                        </Link>
                    </li>
                ))}
            </ul>

            <h1>Previous Races</h1>
            <ul>
                {previousRaces.map((race) => (
                    <li key={race.id}>
                        {race.title} - Winner: {race.winner} ({race.date})
                        <Link href={`/race/${race.id}`}>
                            <button>Watch Replay</button>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

