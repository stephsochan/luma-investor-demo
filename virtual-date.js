// Date packages are separate from ordinary minute-billed calls. A reservation
// snapshots its per-minute rate, including any mutually approved extension.
export const DATE_MINUTES = Object.freeze([15, 30, 60]);
export const DATE_ACTIVITIES = Object.freeze([
  { id: "questions", label: "Get-to-know-you questions", optional: true, canSkip: true, requiresExplicitConsent: false, prompts: ["What makes a weekend feel special?", "What small kindness do you remember?", "What would you love to learn together?"] },
  { id: "game", label: "Two truths and a story", optional: true, canSkip: true, requiresExplicitConsent: false, prompts: ["Share two true things and one made-up story.", "Guess which story is made up.", "Swap roles and compare your guesses."] },
  { id: "planned", label: "Plan a dream date", optional: true, canSkip: true, requiresExplicitConsent: false, prompts: ["Pick a shared city or imaginary destination.", "Plan a meal, activity, and music together.", "Which part would you both do again?"] },
  { id: "truth-dare", label: "Truth or dare (easy to skip)", optional: true, canSkip: true, requiresExplicitConsent: true, prompts: ["Truth: what helps you feel at ease with someone?", "Dare: show your best five-second dance move, or skip.", "Truth: what is a friendship you treasure?"] }
]);

export function dateQuote(minutes, rateCents) {
  if (!DATE_MINUTES.includes(minutes) || !Number.isSafeInteger(rateCents) || rateCents < 1 || rateCents > 500) {
    throw new RangeError("Date package or standard per-minute rate is invalid");
  }
  return Object.freeze({ minutes, rateCents, heldCents: minutes * rateCents });
}

// The connected date uses whole started minutes. Cancellation before connection
// returns the entire hold; ending early returns every unused prepaid minute.
export function settleDate(segments, elapsedSeconds, connected) {
  if (!Array.isArray(segments) || segments.length < 1 || segments.length > 8 ||
      !Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 0 || typeof connected !== "boolean" ||
      (!connected && elapsedSeconds !== 0)) {
    throw new RangeError("Date settlement input is invalid");
  }
  const quotes = segments.map(segment => dateQuote(segment.minutes, segment.rateCents));
  const reservedMinutes = quotes.reduce((sum, quote) => sum + quote.minutes, 0);
  let remainingUsed = connected ? Math.min(reservedMinutes, Math.ceil(elapsedSeconds / 60)) : 0;
  const breakdown = quotes.map(quote => {
    const usedMinutes = Math.min(quote.minutes, remainingUsed);
    remainingUsed -= usedMinutes;
    const chargedCents = usedMinutes * quote.rateCents;
    return { ...quote, usedMinutes, chargedCents, refundedCents: quote.heldCents - chargedCents };
  });
  const heldCents = breakdown.reduce((sum, segment) => sum + segment.heldCents, 0);
  const chargedCents = breakdown.reduce((sum, segment) => sum + segment.chargedCents, 0);
  const refundedCents = heldCents - chargedCents;
  const platformCents = Math.round(chargedCents * 0.30);
  return {
    reservedMinutes,
    usedMinutes: breakdown.reduce((sum, segment) => sum + segment.usedMinutes, 0),
    heldCents, chargedCents, refundedCents,
    platformCents, creatorCents: chargedCents - platformCents,
    breakdown
  };
}
