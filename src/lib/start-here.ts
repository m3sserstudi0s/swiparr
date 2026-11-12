/**
 * The start-here resolver: after a series match, where do we actually begin?
 *
 * Pure and provider-free so the truth table is testable. Callers turn each
 * member's server progress into an `EpisodeRef` index; this module never touches
 * a provider and never invents progress a server does not have.
 */

export interface EpisodeRef {
  season: number;
  episode: number;
}

export interface MemberPosition {
  userId: string;
  name: string;
  /** The host is the only member whose progress is real under guest lending. */
  isHost: boolean;
  /** Index into the ordered episode list of the member's next unwatched episode. */
  nextUnwatchedIndex: number;
  /** True when this position is borrowed from the host's token (guest). */
  borrowed?: boolean;
}

export type StartHereAction = "start" | "continue" | "ahead" | "finished" | "unavailable";

export interface StartHereResult {
  action: StartHereAction;
  episode?: EpisodeRef;
  /** Index into the episode list, when there is a position. */
  episodeIndex?: number;
  /** Short, user-facing line: "Start S1E1", "You're both at S2E4". */
  label: string;
  /** Only for `ahead`: who is jumping forward, and by how much. */
  warning?: string;
  /** S1E1, offered as the alternative whenever a position exists past episode 1. */
  restart?: EpisodeRef;
}

/**
 * Panel heading for a resolved start-here answer.
 *
 * The heading describes whether a position exists, not who owns it: a provider
 * with no watch state (TMDB) still resolves `start`, and calling that "Where you
 * are" claims knowledge nobody has. `null` means the panel should not render.
 */
export function startHereHeading(input: {
  action: StartHereAction;
  hostOnly: boolean;
}): string | null {
  if (input.action === "unavailable" || input.action === "finished") return null;
  // S1E1 is not a position — nobody has started, so there is nothing to be "at".
  if (input.action === "start") return "Where to start";
  if (input.hostOnly) return "The host's position";
  return "Where you are";
}

const label = (ep: EpisodeRef) => `S${ep.season}E${ep.episode}`;

export function resolveStartHere(input: {
  episodes: EpisodeRef[];
  members: MemberPosition[];
  status?: "continuing" | "ended" | "upcoming";
}): StartHereResult {
  const { episodes, members, status } = input;

  if (episodes.length === 0) {
    return { action: "unavailable", label: "No episodes available" };
  }

  const start = episodes[0];
  const restart = episodes.length > 1 ? start : undefined;

  if (members.length === 0) {
    return { action: "start", episode: start, episodeIndex: 0, label: `Start ${label(start)}`, restart };
  }

  const positions = members.map((m) => Math.max(0, Math.min(m.nextUnwatchedIndex, episodes.length)));
  const minIndex = Math.min(...positions);
  const maxIndex = Math.max(...positions);

  // Everyone has watched everything.
  if (minIndex >= episodes.length) {
    return {
      action: "finished",
      label: status === "ended" ? "Series finished" : "You're caught up",
    };
  }

  // Nobody has started: the answer is S1E1, not "the earliest unwatched episode".
  if (maxIndex === 0) {
    return { action: "start", episode: start, episodeIndex: 0, label: `Start ${label(start)}`, restart };
  }

  const target = episodes[minIndex];
  const spread = maxIndex - minIndex;
  const restartAlternative = minIndex > 0 ? restart : undefined;

  // One member is at least two episodes ahead: name them and offer the earlier slot.
  if (spread >= 2) {
    const ahead = members[positions.indexOf(maxIndex)];
    return {
      action: "ahead",
      episode: target,
      episodeIndex: minIndex,
      label: `Start at ${label(target)}`,
      warning: `${ahead?.name ?? "Someone"} is ${spread} episode${spread === 1 ? "" : "s"} ahead`,
      restart: restartAlternative,
    };
  }

  return {
    action: "continue",
    episode: target,
    episodeIndex: minIndex,
    label: `You're both at ${label(target)}`,
    restart: restartAlternative,
  };
}
