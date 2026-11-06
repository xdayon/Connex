import type { EventPerson, Profile } from "./types";

export type MatchReason = { kind: "offers" | "looking" | "also"; item: string };
export type Match = { score: number; reason: MatchReason | null };

type Mine = Pick<Profile, "skills" | "looking_for" | "offering">;

const norm = (s: string) => s.trim().toLowerCase();

function overlap(theirs: string[], mine: string[]): string[] {
  const set = new Set(mine.map(norm));
  return theirs.filter((x) => set.has(norm(x)));
}

export function matchPerson(person: Pick<EventPerson, "skills" | "looking_for" | "offering">, me: Mine): Match {
  const offers = overlap(person.offering, me.looking_for);
  const looking = overlap(person.looking_for, [...me.offering, ...me.skills]);
  const also = overlap(person.skills, me.skills);
  const score = offers.length * 3 + looking.length * 2 + also.length;
  const reason: MatchReason | null = offers[0]
    ? { kind: "offers", item: offers[0] }
    : looking[0]
      ? { kind: "looking", item: looking[0] }
      : also[0]
        ? { kind: "also", item: also[0] }
        : null;
  return { score, reason };
}
