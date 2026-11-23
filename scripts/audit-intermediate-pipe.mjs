// Local rendering audit. Start Vite, then run: node scripts/audit-intermediate-pipe.mjs
import { chromium } from 'playwright';
import { stdout } from 'node:process';
import { readFile } from 'node:fs/promises';
const source = JSON.parse(
  await readFile(
    new URL('../local-roms/intermediate-terrain-pipes.json', import.meta.url),
    'utf8',
  ),
).pipes;
const b = await chromium.launch({
  channel: 'chrome',
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:5173/terrain.html');
  const report = await p.evaluate(async (source) => {
    const { fitIntermediatePipeHoods } =
      await import('/src/rendering/fitIntermediatePipeHoods.ts');
    const fitted = fitIntermediatePipeHoods(source);
    function audit(model) {
      const p = model.positions,
        all = [...model.shell, ...model.interior],
        ids = [];
      for (let i = 0; i < all.length; i += 3)
        if (all.slice(i, i + 3).every((index) => p[index * 3 + 2] > 18))
          ids.push(...all.slice(i, i + 3));
      const edges = new Map();
      let degenerate = 0,
        minArea = Infinity;
      const point = (i) =>
        p
          .slice(i * 3, i * 3 + 3)
          .map((v) => Math.round(v * 1000000))
          .join(',');
      for (let i = 0; i < ids.length; i += 3) {
        const t = ids.slice(i, i + 3);
        for (let j = 0; j < 3; j++) {
          const key = [point(t[j]), point(t[(j + 1) % 3])].sort().join('/');
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
        const [a, b, c] = t.map((i) => p.slice(i * 3, i * 3 + 3)),
          u = b.map((v, i) => v - a[i]),
          v = c.map((v, i) => v - a[i]);
        const area = Math.hypot(
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        );
        if (area < 1e-8) degenerate++;
        minArea = Math.min(minArea, area);
      }

      const triangles = [];
      for (let i = 0; i < ids.length; i += 3)
        triangles.push(
          ids.slice(i, i + 3).map((j) => p.slice(j * 3, j * 3 + 3)),
        );
      const sub = (a, b) => a.map((v, i) => v - b[i]),
        dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
        cross = (a, b) => [
          a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0],
        ];
      function hits(a, b, t) {
        const u = sub(t[1], t[0]),
          v = sub(t[2], t[0]),
          d = sub(b, a),
          h = cross(d, v),
          det = dot(u, h);
        if (Math.abs(det) < 1e-9) return false;
        const q = sub(a, t[0]),
          s = dot(q, h) / det;
        if (s < -1e-7 || s > 1 + 1e-7) return false;
        const r = cross(q, u),
          w = dot(d, r) / det;
        if (w < -1e-7 || s + w > 1 + 1e-7) return false;
        const distance = dot(v, r) / det;
        return distance > 1e-7 && distance < 1 - 1e-7;
      }
      let crossings = 0;
      for (let i = 0; i < triangles.length; i++)
        for (let j = i + 1; j < triangles.length; j++) {
          const a = triangles[i],
            b = triangles[j];
          if (a.some((p) => b.some((q) => Math.hypot(...sub(p, q)) < 1e-5)))
            continue;
          if (
            [0, 1, 2].some(
              (k) =>
                Math.max(...a.map((p) => p[k])) <
                  Math.min(...b.map((p) => p[k])) - 1e-8 ||
                Math.max(...b.map((p) => p[k])) <
                  Math.min(...a.map((p) => p[k])) - 1e-8,
            )
          )
            continue;
          if (
            a.some((p, k) => hits(p, a[(k + 1) % 3], b)) ||
            b.some((p, k) => hits(p, b[(k + 1) % 3], a))
          ) {
            crossings++;
          }
        }
      return {
        crossings,
        triangles: ids.length / 3,
        boundary: [...edges.values()].filter((n) => n === 1).length,
        nonManifold: [...edges.values()].filter((n) => n !== 2).length,
        degenerate,
        minArea,
      };
    }
    return { source: audit(source), fitted: audit(fitted) };
  }, source);
  stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (
    report.fitted.boundary ||
    report.fitted.nonManifold ||
    report.fitted.degenerate ||
    report.fitted.crossings
  )
    process.exitCode = 1;
} finally {
  await b.close();
}
