import React from 'react';
import { CalculateMetadataFunction, Composition, staticFile } from 'remotion';
import { computeTiming } from './engine/timing';
import type { Capture, ProjectConfig } from './engine/types';
import { FilmProps, MotionReadyFilm } from './film/Film';

// One composition renders any project: pass --props='{"project":"<name>"}' (mr.mjs does this for you).
// calculateMetadata loads projects/<name>/project.json + capture/blocks.json and sizes the film from them.
const load: CalculateMetadataFunction<FilmProps> = async ({ props }) => {
  const get = async (p: string) => {
    const r = await fetch(staticFile(p));
    if (!r.ok) throw new Error(`Missing ${p}. Run: node mr.mjs capture ${props.project}`);
    return r.json();
  };
  const config = (await get(`${props.project}/project.json`)) as ProjectConfig;
  const capture = (await get(`${props.project}/capture/blocks.json`)) as Capture;
  const T = computeTiming(config, capture);
  return { durationInFrames: T.total, fps: T.fps, width: T.W, height: T.H, props: { ...props, config: { ...config, name: config.name ?? props.project }, capture } };
};

export const Root: React.FC = () => (
  <Composition id="MotionReady" component={MotionReadyFilm} durationInFrames={600} fps={60} width={1920} height={1080} defaultProps={{ project: 'demo', soundtrack: false }} calculateMetadata={load} />
);
