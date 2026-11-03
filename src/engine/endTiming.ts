// The end card's beats in seconds after timing.endFrom (shared by the picture and the soundtrack).
export const END = {
  dur: 5, // whole end card
  vortex: 0, // the swarm spins up into a funnel in the middle
  form: 1.75, // the funnel unwinds: every cursor flies to a point of the logo
  reveal: 2.5, // the sharp logo lands where the cursors drew it
  lock: 3.0, // the logo moves up, title / subtitle / buttons follow
};
/** The beats for an end card of `dur` seconds (project.json end.duration, 3.5–8): the default beats scaled to fit. */
export const endBeats = (dur?: number) => {
  const d = Math.min(8, Math.max(3.5, dur ?? END.dur));
  const k = d / END.dur;
  return { dur: d, vortex: END.vortex * k, form: END.form * k, reveal: END.reveal * k, lock: END.lock * k };
};
/** Extra cursors that join the swarm for the end card, so the logo is drawn densely enough to read. */
export const END_EXTRA = 140;
