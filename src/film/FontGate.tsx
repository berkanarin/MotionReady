import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import React, { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

/** Renders nothing until the UI fonts are decoded, so no frame shows a fallback face. */
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender('fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([document.fonts.load('600 16px "Geist Variable"'), document.fonts.load('500 12px "Geist Mono Variable"')])
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        requestAnimationFrame(() => continueRender(handle));
      });
  }, [handle]);
  return ready ? <>{children}</> : null;
};
