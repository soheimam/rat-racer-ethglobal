import RaceTrack from '@/components/racetrack';
import { RaceParticipant, RaceRat } from '@/lib/schema';
import { getRace } from '@/lib/utils';

// NOTE: No audio files found locally. Add .mp3 files to /public/audio/ directory
// Expected files: /public/audio/rat-racer.mp3, /public/audio/neon-skys.mp3
const SONGS = [
    '/audio/rat-racer.mp3',
    '/audio/neon-skys.mp3',
];

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function Page(props: {
    params: Params
    searchParams: SearchParams
}) {
    const race = await getRace((await props.params).id);
    const rats = transformToRaceRats(race?.participants || []);

    // Select song on the server side using a deterministic method
    // Here we're using the race ID to consistently select a song
    const raceId = (await props.params).id;
    const songIndex = parseInt(raceId.slice(-1), 16) % SONGS.length; // Use last character of race ID
    const selectedSong = SONGS[songIndex];

    return (
        <main className="flex flex-col items-center justify-between min-h-screen bg-gray-900 text-white">
            <RaceTrack rats={rats} selectedSong={selectedSong} />
        </main>
    );
}

// Function to transform the race participants to the race rats
function transformToRaceRats(participants: RaceParticipant[]): RaceRat[] {
    // Map local image paths to texture files
    const textureMap: Record<string, string> = {
        "/images/white.png": "material_baseColor",
        "/images/pink.png": "material_normal",
        "/images/brown.png": "material_metallicRoughness"
    }

    return participants.map((participant, index) => ({
        id: Number(participant.id.split('_')[1]),
        name: participant.name,
        modelPath: `/models/rat-${index + 1}/rat.gltf`,
        texturePath: `/models/rat-${index + 1}/textures/${textureMap[participant.contentUrl] || "material_baseColor"}.png`,
        position: [0, 0, 2 - index], // Space rats evenly from 2 to -3
        age: convertCreatedAtToAge(participant.dob),
        speeds: participant.speeds,
        bloodline: participant.stats?.bloodline,
        gangId: participant.gangId,
        gender: participant.gender,
        imageUrl: participant.contentUrl,
        level: determineLevel(participant.wins, participant.placed, convertCreatedAtToAge(participant.dob)),
        wins: participant.wins,
        placed: participant.placed,
        losses: participant.losses
    }));
}

const determineLevel = (wins: number, placed: number, age: number) => {
    const winPoints = Math.floor(wins / 10);
    const placePoints = Math.floor(placed / 20);
    const ageBonus = Math.floor(age / 2);
    return winPoints + placePoints + ageBonus + 1;
}

const convertCreatedAtToAge = (createdAt: string) => {
    const now = new Date();
    const createdAtDate = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - createdAtDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
