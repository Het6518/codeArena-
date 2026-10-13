// Rating over battles. One point per finished battle, evenly spaced, with the y axis on
// rounded ticks that cover the data. Colors come from the theme tokens.
const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

const niceStep = (span) => {
  const raw = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw || 1));
  const normalized = raw / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function RatingChart({ points }) {
  if (!points || points.length < 2) {
    return <p className="muted chart-empty">The chart appears after the first finished battle.</p>;
  }

  const ratings = points.map((point) => point.rating);
  const rawMin = Math.min(...ratings);
  const rawMax = Math.max(...ratings);
  const step = niceStep(Math.max(rawMax - rawMin, 40));
  const min = Math.floor((rawMin - step / 2) / step) * step;
  const max = Math.ceil((rawMax + step / 2) / step) * step;

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (index) => PAD.left + (index / (points.length - 1)) * plotWidth;
  const y = (rating) => PAD.top + (1 - (rating - min) / (max - min)) * plotHeight;

  const ticks = [];
  for (let value = min; value <= max; value += step) ticks.push(value);

  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(point.rating).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${PAD.top + plotHeight} L ${PAD.left} ${PAD.top + plotHeight} Z`;
  const last = points[points.length - 1];

  return (
    <div className="chart-wrap">
      <svg
        className="rating-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Rating history from ${points[0].rating} to ${last.rating} over ${points.length - 1} battles`}
      >
        {ticks.map((value) => (
          <g key={value}>
            <line className="chart-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} />
            <text className="chart-label" x={PAD.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle">
              {value}
            </text>
          </g>
        ))}

        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />

        {points.map((point, index) => (
          <circle key={`${point.at}-${index}`} className="chart-point" cx={x(index)} cy={y(point.rating)} r={3}>
            <title>
              {point.rating} · {formatDate(point.at)}
            </title>
          </circle>
        ))}

        <circle className="chart-point-last" cx={x(points.length - 1)} cy={y(last.rating)} r={5} />

        <text className="chart-label" x={PAD.left} y={HEIGHT - 8}>
          {formatDate(points[0].at)}
        </text>
        <text className="chart-label" x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end">
          {formatDate(last.at)}
        </text>
      </svg>
    </div>
  );
}
