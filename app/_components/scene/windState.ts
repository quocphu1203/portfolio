/**
 * Shared, mutable wind state for lightweight weather effects (leaves, rain, flags, clouds).
 * One driver (WeatherEffects) advances it every frame; everything else only reads it.
 */
export const wind = {
  /** Normalised horizontal direction the wind blows towards. */
  dirX: Math.cos(0.65),
  dirZ: Math.sin(0.65),
  /** 0..1, slow base breeze plus gusts. */
  strength: 0.5,
  /** 0..1 gust component on top of the base breeze. */
  gust: 0,
  time: 0,
};

export function stepWind(delta: number, calm = false) {
  wind.time += delta;
  const t = wind.time;
  // Direction wanders slowly around a prevailing heading.
  const angle = 0.65 + Math.sin(t * 0.021) * 0.45 + Math.sin(t * 0.047 + 1.3) * 0.18;
  wind.dirX = Math.cos(angle);
  wind.dirZ = Math.sin(angle);
  // Sum of incommensurate sines -> irregular, slow gusts.
  const raw = Math.sin(t * 0.31) * 0.5 + Math.sin(t * 0.173 + 2.1) * 0.35 + Math.sin(t * 0.71 + 0.4) * 0.15;
  wind.gust = Math.max(0, raw);
  wind.strength = (calm ? 0.4 : 1) * (0.42 + wind.gust * 0.58);
}
