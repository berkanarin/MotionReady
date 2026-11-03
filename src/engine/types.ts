// Shared data shapes: what a project asks for (project.json) and what the capture step measured (capture/blocks.json).

export type Format = 'landscape' | 'portrait' | 'square';

export type SceneSpec = {
  /** Section id (or tag) as listed in capture/blocks.json → sections. */
  section: string;
  /** Length of the scene in bars of the project's tempo. */
  bars?: number;
};

export type EndSpec = {
  title: string;
  subtitle?: string;
  button?: string;
  url?: string;
  /** Seconds of the end card (3.5–8, default 5); its beats scale to fit. */
  duration?: number;
};

export type ProjectConfig = {
  name: string;
  /** Page to build: an http(s) URL, or a path relative to the project folder (e.g. "site/index.html"). */
  url: string;
  format?: Format;
  fps?: number;
  /** Tempo the cuts land on. Use your music's own BPM. */
  bpm?: number;
  /** Seconds of the hook (the swarm circling the logo) before the drop. Snapped to whole beats. */
  hook?: number;
  /** "auto" picks the page's sections top to bottom; or list them yourself. */
  scenes?: 'auto' | SceneSpec[];
  maxScenes?: number;
  barsPerScene?: number;
  cursors?: number;
  /** Labels the cursors carry while they work (your product's tools, features, team names…). */
  tags?: string[];
  palette?: string[];
  /** Visible text of the button the swarm gathers on and presses at the end (optional). */
  cta?: string;
  /** End card after the build (optional). */
  end?: EndSpec;
  /** Backdrop behind the browser window. */
  background?: string;
  /** Address shown in the browser bar (defaults to the URL's host). */
  address?: string;
  capture?: {
    width?: number;
    dpr?: number;
    maxHeight?: number;
    wait?: number;
    /** CSS selectors removed before capture (cookie banners, chat widgets…). */
    hide?: string[];
  };
  audio?: {
    /** Music file inside projects/<name>/audio/. Never committed (see .gitignore). */
    music?: string;
    /** Second of the music file that lands on the drop. */
    musicDrop?: number;
    musicGainDb?: number;
    sfx?: boolean;
  };
};

export type Rect = [number, number, number, number];

export type RawBlock = {
  kind: 'frame' | 'media' | 'text';
  r: Rect;
  tag: string;
  size?: number;
  lines?: number;
  text?: string;
  radius?: number;
  /** frame: its own fill is dark */
  dark?: boolean;
  /** what it sits on is dark */
  bgDark?: boolean;
};

export type Capture = {
  url: string;
  title: string;
  W: number;
  H: number;
  DPR: number;
  nav: { r: Rect; radius: number } | null;
  /** The nav's first picture (or, with no nav, the first picture in the top band), captured sharp (capture/logo.png) for the end card. */
  logo?: { r: Rect; file: string } | null;
  sections: { id: string; r: Rect; dark: boolean }[];
  blocks: RawBlock[];
};

export type Loaded = { project: string; config: ProjectConfig; capture: Capture };
