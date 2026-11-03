import React, { createContext, useContext } from 'react';
import { staticFile } from 'remotion';
import type { Plan } from '../engine/plan';
import type { Timing } from '../engine/timing';
import type { Capture, ProjectConfig } from '../engine/types';

export type Film = {
  project: string;
  cfg: ProjectConfig;
  cap: Capture;
  T: Timing;
  plan: Plan;
  src: { page: string; bare: string; ground: string };
};

const Ctx = createContext<Film | null>(null);
export const FilmProvider: React.FC<{ value: Film; children: React.ReactNode }> = ({ value, children }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useFilm = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFilm outside <FilmProvider>');
  return v;
};

export const captureSrc = (project: string) => ({
  page: staticFile(`${project}/capture/page.png`),
  bare: staticFile(`${project}/capture/bare.png`),
  ground: staticFile(`${project}/capture/ground.png`),
});

export const BLUE = '#3B82F6';
export const RED = '#F0442B';
export const SANS = '"Geist Variable", "Geist", system-ui, sans-serif';
export const MONO = '"Geist Mono Variable", ui-monospace, monospace';
