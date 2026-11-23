import {
  readCapturedProfile,
  makeCalibrationCases,
  makeCalibrationPhaseCases,
  makeCalibrationRefinementCases,
} from '../src/diagnostics/captureCalibration.ts';
import { distributeImpulse } from '../src/diagnostics/impulseProfiles.ts';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const baseURL = process.env.MARBLE_TEST_URL || 'http://127.0.0.1:5173/';
const target = new URL(baseURL);
if (
  target.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
)
  throw Error('Serveur HTTP loopback requis.');
const calibrationMode = process.argv.includes('--calibration');
const tracePorts = process.argv.includes('--ports') || calibrationMode;
const compareProfiles = process.argv.includes('--profiles');
if (tracePorts && compareProfiles)
  throw Error('Choisir --ports ou --profiles séparément.');
const calibrationSource = calibrationMode
  ? readCapturedProfile(
      JSON.parse(
        await readFile(
          new URL(
            '../third_party/captured-motion-evidence.json',
            import.meta.url,
          ),
          'utf8',
        ),
      ),
    )
  : null;
const calibrationCases = calibrationSource
  ? process.argv.includes('--refine')
    ? makeCalibrationRefinementCases(calibrationSource)
    : process.argv.includes('--phase-check')
      ? makeCalibrationPhaseCases(calibrationSource)
      : makeCalibrationCases(
          calibrationSource,
          process.argv.includes('--quick'),
        )
  : null;
const reportPath = calibrationMode
  ? process.argv.includes('--refine')
    ? 'test-results/capture-calibration-refined.json'
    : process.argv.includes('--phase-check')
      ? 'test-results/capture-calibration-phase.json'
      : 'test-results/capture-calibration.json'
  : compareProfiles
    ? process.argv.includes('--quick')
      ? 'test-results/impulse-profiles-quick.json'
      : 'test-results/impulse-profiles.json'
    : tracePorts
      ? 'test-results/trackball-ports.json'
      : 'test-results/impulse-response.json';
const cases = calibrationCases
  ? calibrationCases.map((c, i) => [i, c.profile.length])
  : compareProfiles
    ? process.argv.includes('--quick')
      ? [
          [0, 1],
          [1536, 1],
          [1536, 4],
          [1536, 6],
          [1536, 12],
          [0, 1],
        ]
      : [
          [0, 1],
          [1536, 1],
          [1536, 2],
          [1536, 4],
          [1536, 6],
          [1536, 12],
          [416, 1],
          [416, 2],
          [416, 4],
          [416, 8],
          [0, 1],
        ]
    : process.argv.includes('--quick')
      ? [
          [0, 1],
          [256, 1],
          [0, 1],
        ]
      : [
          [0, 1],
          [16, 1],
          [64, 1],
          [128, 1],
          [256, 1],
          [416, 1],
          [768, 1],
          [1536, 1],
          [0, 1],
          [64, 6],
          [256, 6],
        ];
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const evidence = {
  browser: browser.version(),
  method: calibrationMode
    ? 'Captured paired native input scaled by equivalent gain; fresh runtime each case, credit700/start710; full profile and fixed 8-iteration peak window; native polls and real ports verified. Calibration is diagnostic, not a player preference change.'
    : compareProfiles
      ? 'Equal-total integer profiles; fresh document; credit700/start710; input1200; images1199/1206/1212/1224/1236; direct native pending diagnostic'
      : 'fresh document per trial; credit frames700-707; start710-717; pulse1200; positions1199/1206/1212; native delta without event filter or range guard',
  trials: [],
};
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  await context.addInitScript((capturePorts) => {
    if (capturePorts) {
      const remember = async (result, binary) => {
        const instance = result.instance || result;
        if (
          instance.exports.Eh instanceof WebAssembly.Table &&
          instance.exports.Ch instanceof WebAssembly.Memory
        ) {
          if (binary instanceof WebAssembly.Module)
            throw Error('Octets du cœur indisponibles pour vérifier le hash.');
          const digest = await window.crypto.subtle.digest('SHA-256', binary);
          window.impulseCore = {
            exports: instance.exports,
            hash: Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0'),
            ).join(''),
          };
        }
        return result;
      };
      const instantiate = WebAssembly.instantiate.bind(WebAssembly);
      WebAssembly.instantiate = async (binary, imports) =>
        remember(await instantiate(binary, imports), binary);
      const streaming = WebAssembly.instantiateStreaming.bind(WebAssembly);
      WebAssembly.instantiateStreaming = async (source, imports) => {
        const response = await source;
        const bytes = response.clone().arrayBuffer();
        return remember(await streaming(response, imports), await bytes);
      };
    }
    let actual;
    Object.defineProperty(window, 'EmulatorJS', {
      configurable: true,
      get: () => actual,
      set: (Class) => {
        actual = new Proxy(Class, {
          construct(target, args) {
            const instance = Reflect.construct(target, args);
            window.impulseEmulator = instance;
            return instance;
          },
        });
      },
    });
  }, tracePorts);
  const page = await context.newPage();
  for (const [amplitude, duration] of cases) {
    const calibration = calibrationCases?.[amplitude] ?? null;
    const profile = calibration
      ? calibration.profile
      : compareProfiles
        ? distributeImpulse(amplitude, duration)
        : Array(duration).fill(amplitude);
    const vectors = calibration ? profile : profile.map((x) => [x, 0]);
    const terrainRegion = calibration
      ? [900, 250, 1000, 650]
      : [100, 300, 1000, 700];
    const sampleFrames = calibration
      ? calibration.sampleFrames
      : compareProfiles
        ? [1199, 1206, 1212, 1224, 1236]
        : [1199, 1206, 1212];
    const endFrame = sampleFrames.at(-1);
    const inputFrame = calibration?.startFrame ?? 1200;
    const errors = [];
    const listener = (e) => errors.push(e.message);
    page.on('pageerror', listener);
    await page.goto(baseURL);
    await page.locator('#prepare').click();
    await page
      .getByText('Démarrer l’émulation', { exact: true })
      .click({ timeout: 30000 });
    await page.waitForFunction(
      () => !document.querySelector('#credit').disabled,
      { timeout: 30000 },
    );
    const result = await page.evaluate(
      async ({
        amplitude,
        duration,
        tracePorts,
        profile,
        vectors,
        calibration,
        terrainRegion,
        inputFrame,
        sampleFrames,
        endFrame,
      }) => {
        const instance = window.impulseEmulator,
          manager = instance.gameManager,
          module = instance.Module;
        const initialFrame = manager.functions.getFrameNum();
        if (initialFrame > 650) throw Error('late harness');
        const gl = instance.canvas.getContext('webgl2');
        const modulePath = '/src/diagnostics/blueMarker.ts';
        const { locateBlueMarker } = await import(modulePath);
        const terrainPath = '/src/diagnostics/staticRegion.ts';
        const { countChangedPixels } = await import(terrainPath);
        let terrainReference;
        let terrainChangedPixels;
        function locate() {
          const width = instance.canvas.width,
            height = instance.canvas.height,
            pixels = new Uint8Array(width * height * 4);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          if (sampleFrames.length > 3) {
            terrainReference ??= pixels;
            terrainChangedPixels = countChangedPixels(
              terrainReference,
              pixels,
              width,
              height,
              terrainRegion,
            );
          }
          return locateBlueMarker(pixels, width, height);
        }
        let frame = initialFrame;
        let probe;
        let portsModule;
        if (tracePorts) {
          const portsPath = '/src/diagnostics/trackballPorts.ts';
          portsModule = await import(portsPath);
          const core = window.impulseCore;
          if (!core) throw Error('Exports du cœur non capturés.');
          probe = await portsModule.traceTrackballPorts({
            wasmHash: core.hash,
            table: core.exports.Eh,
            memory: core.exports.Ch,
            frame: () => manager.functions.getFrameNum(),
            iterationFrame: () => frame,
            from: 1198,
            to: calibration ? endFrame + 1 : 1213,
          });
        }
        try {
          const result = await new Promise((resolve, reject) => {
            const samples = [],
              polls = [];
            const timer = setTimeout(
              () => reject(Error('timeout at frame ' + frame)),
              35000,
            );
            module.marbleBeforeIteration = () => {
              frame = manager.functions.getFrameNum();
              if (frame === 700) manager.simulateInput(0, 2, 1);
              if (frame === 708) manager.simulateInput(0, 2, 0);
              if (frame === 710) manager.simulateInput(0, 3, 1);
              if (frame === 718) manager.simulateInput(0, 3, 0);
              module.marbleNativeInput.setPending(
                vectors[frame - inputFrame]?.[0] ?? 0,
                vectors[frame - inputFrame]?.[1] ?? 0,
              );
            };
            module.marbleAfterIteration = () => {
              if (frame >= 1199 && frame <= endFrame)
                polls.push({ frame, ...module.marbleNativeInput.state() });
            };
            module.marbleOnVideoFrame = () => {
              if (sampleFrames.includes(frame)) {
                const position = locate();
                samples.push({
                  frame,
                  position,
                  ...(terrainChangedPixels !== undefined
                    ? { terrainChangedPixels }
                    : {}),
                });
              }
              if (frame >= endFrame) {
                instance.pause();
                clearTimeout(timer);
                resolve({
                  amplitude,
                  duration,
                  profile,
                  calibration,
                  terrainRegion,
                  total: calibration
                    ? [
                        vectors.reduce((n, p) => n + p[0], 0),
                        vectors.reduce((n, p) => n + p[1], 0),
                      ]
                    : profile.reduce((a, b) => a + b, 0),
                  initialFrame,
                  canvas: [instance.canvas.width, instance.canvas.height],
                  samples,
                  polls,
                });
              }
            };
          });
          if (probe) {
            const trace = probe.snapshot();
            if (trace.dropped || trace.observerErrors || !trace.reads.length)
              throw Error('Trace des ports incomplète ou indisponible.');
            const previous = new Map();
            const steps = trace.reads.map((read) => {
              const last = previous.get(read.offset);
              previous.set(read.offset, read.value);
              return {
                ...read,
                step:
                  last === undefined
                    ? null
                    : portsModule.signedCounterStep(last, read.value),
              };
            });
            return {
              ...result,
              portTrace: {
                wasmHash: window.impulseCore.hash,
                handlerIndex: portsModule.TRACKBALL_HANDLER_INDEX,
                mapAddress: portsModule.TRACKBALL_MAP_ADDRESS,
                ...trace,
                steps,
              },
            };
          }
          return result;
        } finally {
          probe?.dispose();
        }
      },
      {
        amplitude,
        duration,
        tracePorts,
        profile,
        vectors,
        calibration,
        terrainRegion,
        inputFrame,
        sampleFrames,
        endFrame,
      },
    );
    const observed = result.polls.filter(
      (poll) => poll.polledX || poll.polledY,
    );
    if (
      observed.length !== vectors.filter(([x, y]) => x || y).length ||
      result.polls.some(
        (poll) =>
          poll.polledX !== (vectors[poll.frame - inputFrame]?.[0] ?? 0) ||
          poll.polledY !== (vectors[poll.frame - inputFrame]?.[1] ?? 0),
      )
    )
      throw Error(
        'Impulsion native différente de la consigne : essai non interprétable.',
      );
    if (
      result.samples.map((sample) => sample.frame).join(',') !==
      sampleFrames.join(',')
    )
      throw Error('Images de référence manquantes.');
    result.errors = errors;
    page.off('pageerror', listener);
    evidence.trials.push(result);
    await writeFile(reportPath, JSON.stringify(evidence, null, 2));
    const start = result.samples[0]?.position,
      end = result.samples.at(-1)?.position;
    console.log(
      JSON.stringify({
        amplitude,
        duration,
        calibration: calibration
          ? {
              label: calibration.label,
              gain: calibration.gain,
              scope: calibration.scope,
            }
          : null,
        profile,
        total: result.total,
        start,
        end,
        dx: start && end ? end.x - start.x : null,
        dy: start && end ? end.y - start.y : null,
        polls: result.polls.map((p) => p.polledX).filter(Boolean),
        portReads: result.portTrace?.reads.length,
        errors,
      }),
    );
  }
  const starts = evidence.trials.map((trial) => trial.samples[0]?.position);
  const reference = starts[0];
  if (
    !reference ||
    starts.some(
      (position) =>
        !position ||
        Math.hypot(position.x - reference.x, position.y - reference.y) > 1,
    )
  )
    throw Error(
      'Départs non comparables : ne pas interpréter les déplacements.',
    );
  if (evidence.trials.some((trial) => trial.errors.length))
    throw Error('Erreur JavaScript pendant les essais.');
  if (
    compareProfiles &&
    evidence.trials.some((trial) =>
      trial.samples.some((sample) => sample.terrainChangedPixels !== 0),
    )
  )
    throw Error(
      'Décor modifié dans la région témoin : ne pas attribuer le déplacement au seul marqueur.',
    );
  console.log(`Départs identiques à 1 pixel près ; résultats : ${reportPath}`);
} finally {
  await browser.close();
}
