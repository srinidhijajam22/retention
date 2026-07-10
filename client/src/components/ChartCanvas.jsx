import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Thin wrapper that owns a Chart.js instance tied to a <canvas>, rebuilding
// it whenever `config` changes (Chart.js instances aren't cheaply patchable
// across dataset/type changes, so we just re-create on config identity change).
export default function ChartCanvas({ config, height = 220, ariaLabel }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !config) return;
    chartRef.current = new Chart(canvasRef.current, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel}></canvas>
    </div>
  );
}
