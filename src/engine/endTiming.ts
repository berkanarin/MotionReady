// The end card's beats in seconds after timing.endFrom (shared by the picture and the soundtrack).
export const END = {
  dur: 5, // whole end card
  vortex: 0, // the swarm spins up into a funnel in the middle
  form: 1.75, // the funnel unwinds: every cursor flies to a point of the logo
  reveal: 2.5, // the sharp logo lands where the cursors drew it
  lock: 3.0, // the logo moves up, title / subtitle / buttons follow
};
/** Extra cursors that join the swarm for the end card, so the logo is drawn densely enough to read. */
export const END_EXTRA = 140;
