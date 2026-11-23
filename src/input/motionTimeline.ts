interface EventBatch {
  events: number;
  generatedCommands: number;
  peakSentL1: number;
  firstEventSeconds: number | null;
  lastEventSeconds: number | null;
  rawX: number;
  rawY: number;
  sentX: number;
  sentY: number;
}
interface TimelineRow extends EventBatch {
  frame: number;
  seconds: number;
  polledX: number;
  polledY: number;
}
interface Segment {
  id: number;
  started: number;
  lastEvent: number;
  score: number;
  reason: string | null;
  rows: TimelineRow[];
  batch: EventBatch;
}
const emptyBatch = (): EventBatch => ({
  events: 0,
  generatedCommands: 0,
  peakSentL1: 0,
  firstEventSeconds: null,
  lastEventSeconds: null,
  rawX: 0,
  rawY: 0,
  sentX: 0,
  sentY: 0,
});

/** Observe only: keep the strongest bounded segment until the explicit pause. */
export function createMotionTimeline() {
  let status: 'idle' | 'armed' | 'recording' | 'complete' = 'idle';
  let reason: string | null = null;
  let lastTime = -Infinity;
  let gain = 1;
  let segmentsSeen = 0;
  let candidate: Segment | null = null;
  let best: Segment | null = null;
  function time(value: number) {
    if (!Number.isFinite(value) || value < lastTime)
      throw new RangeError('Non-monotonic timeline');
    lastTime = value;
  }
  function finish(value: string) {
    if (!candidate) return;
    candidate.reason = value;
    if (!best || candidate.score > best.score) best = candidate;
    candidate = null;
  }
  function stop(value: string, cancelArmed = false) {
    // Waiting for capture must survive resume/purges before the first motion.
    if (status === 'recording' || (cancelArmed && status === 'armed')) {
      finish(value);
      status = 'complete';
      reason = value;
    }
  }
  return {
    arm(value: number) {
      if (!Number.isFinite(value) || value <= 0)
        throw new RangeError('Invalid gain');
      gain = value;
      status = 'armed';
      reason = null;
      candidate = best = null;
      segmentsSeen = 0;
      lastTime = -Infinity;
    },
    event(
      seconds: number,
      rawX: number,
      rawY: number,
      sentX: number,
      sentY: number,
      generated = false,
    ) {
      if (status !== 'armed' && status !== 'recording') return;
      if (![rawX, rawY, sentX, sentY].every(Number.isFinite))
        throw new RangeError('Invalid event');
      time(seconds);
      if (
        rawX === 0 &&
        rawY === 0 &&
        (!generated || (sentX === 0 && sentY === 0))
      )
        return;
      if (!candidate) {
        candidate = {
          id: ++segmentsSeen,
          started: seconds,
          lastEvent: seconds,
          score: 0,
          reason: null,
          rows: [],
          batch: emptyBatch(),
        };
      }
      status = 'recording';
      candidate.lastEvent = seconds;
      const batch = candidate.batch;
      batch.firstEventSeconds ??= seconds - candidate.started;
      batch.lastEventSeconds = seconds - candidate.started;
      if (generated) batch.generatedCommands++;
      else batch.events++;
      batch.rawX += rawX;
      batch.rawY += rawY;
      batch.sentX += sentX;
      batch.sentY += sentY;
      batch.peakSentL1 = Math.max(
        batch.peakSentL1,
        Math.abs(batch.sentX) + Math.abs(batch.sentY),
      );
      candidate.score = Math.max(candidate.score, batch.peakSentL1);
    },
    sample(seconds: number, frame: number, polledX: number, polledY: number) {
      if (status !== 'recording' || !candidate) return;
      if (
        !Number.isInteger(frame) ||
        ![polledX, polledY].every(Number.isFinite)
      )
        throw new RangeError('Invalid native sample');
      time(seconds);
      candidate.rows.push({
        frame,
        seconds: seconds - candidate.started,
        ...candidate.batch,
        polledX,
        polledY,
      });
      candidate.batch = emptyBatch();
      candidate.score = Math.max(
        candidate.score,
        Math.abs(polledX) + Math.abs(polledY),
      );
      if (candidate.rows.length >= 128 || seconds - candidate.started >= 2)
        finish('limit');
      else if (
        seconds - candidate.lastEvent >= 0.18 &&
        polledX === 0 &&
        polledY === 0
      )
        finish('quiet');
      // A completed segment never stops the trial: later stronger motion can replace it.
    },
    stop,
    get snapshot() {
      const selected =
        candidate && (!best || candidate.score > best.score) ? candidate : best;
      const rows = selected?.rows ?? [];
      const batch = selected?.batch ?? emptyBatch();
      const active = rows.filter(
        (row) => row.polledX !== 0 || row.polledY !== 0,
      );
      return {
        status,
        reason,
        gain,
        mode: 'event-batches-and-last-poll-after-iteration',
        selection: {
          mode: 'strongest-command-segment',
          metric: 'peak-l1-sent-or-last-native-poll',
          segmentsSeen,
          selectedSegment: selected?.id ?? null,
          selectedReason: selected?.reason ?? null,
          peakL1: selected?.score ?? 0,
        },
        limits: {
          rowsPerSegment: 128,
          secondsPerSegment: 2,
          quietSeconds: 0.18,
        },
        summary: {
          eventDurationSeconds: selected
            ? selected.lastEvent - selected.started
            : 0,
          generatedCommands:
            rows.reduce((n, row) => n + row.generatedCommands, 0) +
            batch.generatedCommands,
          events: rows.reduce((n, row) => n + row.events, 0) + batch.events,
          nonzeroNativeSamples: active.length,
          nativeSpanIterations: active.length
            ? active.at(-1)!.frame - active[0]!.frame + 1
            : 0,
          peakNativeL1: rows.reduce(
            (n, row) =>
              Math.max(n, Math.abs(row.polledX) + Math.abs(row.polledY)),
            0,
          ),
        },
        // Never present interrupted events as native polls.
        unsampledEvents: { ...batch },
        rows: rows.map((row) => ({ ...row })),
      };
    },
  };
}
