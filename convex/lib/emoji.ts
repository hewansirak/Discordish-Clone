/** Emoji available as message reactions, in display order. */
export const REACTION_EMOJI = ["👍", "❤️", "😂", "🎉", "😮", "😢"] as const;

export function isReactionEmoji(value: string): boolean {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}

export type ReactionSummary = { emoji: string; count: number; reacted: boolean };

/** Collapse raw reaction rows into per-emoji counts, marking the ones the viewer added. */
export function summarizeReactions(
  rows: { emoji: string; user: string }[],
  viewer: string
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();
  for (const row of rows) {
    const entry = byEmoji.get(row.emoji) ?? { emoji: row.emoji, count: 0, reacted: false };
    entry.count += 1;
    entry.reacted ||= row.user === viewer;
    byEmoji.set(row.emoji, entry);
  }
  const order = (emoji: string) => {
    const index = (REACTION_EMOJI as readonly string[]).indexOf(emoji);
    return index === -1 ? REACTION_EMOJI.length : index;
  };
  return [...byEmoji.values()].sort((a, b) => order(a.emoji) - order(b.emoji));
}
