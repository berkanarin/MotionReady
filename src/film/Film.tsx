import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import { getPlan } from '../engine/plan';
import { computeTiming } from '../engine/timing';
import type { Capture, ProjectConfig } from '../engine/types';
import { Browser } from './Chrome';
import { captureSrc, FilmProvider, useFilm } from './context';
import { EndCard } from './EndCard';
import { FontGate } from './FontGate';
import { Hook } from './Hook';
import { Swarm } from './Swarm';

export type FilmProps = { project: string; config?: ProjectConfig; capture?: Capture; soundtrack?: boolean };

const Frame: React.FC = () => {
  const f = useCurrentFrame();
  const { T, cfg } = useFilm();
  return (
    <AbsoluteFill style={{ background: cfg.background ?? 'radial-gradient(ellipse at 50% 45%, #1A1D26 0%, #0B0C10 70%)', overflow: 'hidden' }}>
      {f < T.endFrom + 24 && (
        <>
          <Browser f={f} />
          <Hook f={f} />
        </>
      )}
      {/* from the end card on, the end card draws the swarm itself */}
      {(!cfg.end || f < T.endFrom) && <Swarm f={f} />}
      {cfg.end && f >= T.endFrom - 10 && <EndCard f={f} />}
    </AbsoluteFill>
  );
};

/** The film for one project. `config` and `capture` are filled in by calculateMetadata (see Root.tsx). */
export const MotionReadyFilm: React.FC<FilmProps> = ({ project, config, capture, soundtrack }) => {
  const film = useMemo(() => {
    if (!config || !capture) return null;
    const T = computeTiming(config, capture);
    const plan = getPlan(`${project}:${capture.blocks.length}:${capture.H}`, config, capture, T);
    return { project, cfg: config, cap: capture, T, plan, src: captureSrc(project) };
  }, [project, config, capture]);
  if (!film)
    return (
      <AbsoluteFill style={{ background: '#111', color: '#fff', font: '600 40px sans-serif', alignItems: 'center', justifyContent: 'center' }}>
        node mr.mjs capture {project}
      </AbsoluteFill>
    );
  return (
    <FontGate>
      <FilmProvider value={film}>
        <Frame />
      </FilmProvider>
      {soundtrack && <Audio src={staticFile(`${project}/out/soundtrack.wav`)} />}
    </FontGate>
  );
};
