import { Config } from '@remotion/cli/config';

// Each project folder (projects/<name>/) is served as static files: staticFile('<name>/capture/page.png').
Config.setPublicDir('./projects');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
