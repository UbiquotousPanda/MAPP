// The vmThreads pool gives each test file a jsdom context without Node's web streams, which msw needs.
import * as streams from 'node:stream/web';

for (const [name, value] of Object.entries(streams)) {
  if (!(name in globalThis)) Object.assign(globalThis, { [name]: value });
}
