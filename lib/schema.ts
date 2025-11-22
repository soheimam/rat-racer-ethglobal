import { z } from "zod";

const vector3Schema = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
});

export const raceRatSchema = z.object({
    id: z.number(),
    name: z.string(),
    modelPath: z.string(),
    texturePath: z.string(),
    currentPosition: vector3Schema.optional(),
    speeds: z.array(z.number()),
    gangId: z.string(),
    bloodline: z.string(),
    position: z.array(z.number()),
    gender: z.string(),
    age: z.number(),
    wins: z.number(),
    placed: z.number(),
    losses: z.number(),
    level: z.number(),
    imageUrl: z.string(),
})

export const raceParticipantSchema = z.object({
    id: z.string(),
    name: z.string(),
    owner: z.string(),
    gangId: z.string(),
    ownerWallet: z.string(),
    dob: z.string(),
    gender: z.string(),
    wins: z.number(),
    placed: z.number(),
    losses: z.number(),
    contentUrl: z.string(),
    speeds: z.array(z.number()),
    stats: z.object({
        stamina: z.number(),
        agility: z.number(),
        bloodline: z.string()
    })
});


export const raceSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    prizePool: z.string(),
    typename: z.string(),
    price: z.string(),
    contentUrl: z.string(),
    title: z.string(),
    description: z.string(),
    seasonId: z.string(),
    winners: z.array(z.object({
        id: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
        prize: z.string().optional().nullable(),
        token: z.string().optional().nullable()
    })).optional().nullable(),
    raceId: z.string(),
    participants: z.array(raceParticipantSchema),
    status: z.string()
})

export const shopRatSchema = z.object({
    id: z.string(),
    contentUrl: z.string(),
    isTraining: z.boolean().optional().nullable(),
    isTrainingSince: z.string().optional().nullable(),
    createdAt: z.string(),
    description: z.string().optional().nullable(),
    gangId: z.string().optional().nullable(),
    itemId: z.string().optional().nullable(),
    owner: z.string().optional().nullable(),
    tokenId: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    rarity: z.string().optional().nullable(),
    wins: z.number().optional().nullable(),
    placed: z.number().optional().nullable(),
    losses: z.number().optional().nullable(),
    name: z.string().optional().nullable(),
    seasonId: z.string(),
    stats: z.object({
        agility: z.number(),
        bloodline: z.string(),
        stamina: z.number()
    }),
    gender: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    typename: z.string(),
    updatedAt: z.string()
})


export const raceParticipantCountSchema = z.object({
    owner: z.string(),
    races: z.number(),
})


export type RaceParticipant = z.infer<typeof raceParticipantSchema>;
export type Race = z.infer<typeof raceSchema>;
export type ShopRat = z.infer<typeof shopRatSchema>;
export type RaceRat = z.infer<typeof raceRatSchema>;
