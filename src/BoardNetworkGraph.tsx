import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { ZoomBehavior } from 'd3-zoom';
import type { D3DragEvent } from 'd3-drag';

type NodeDatum = {
  id: string;
  label?: string;
  size?: number;
  color?: string;
  title?: string;
  x?: number; y?: number; vx?: number; vy?: number;
  fx?: number | null; fy?: number | null;
};

type LinkDatum = { source: string | NodeDatum; target: string | NodeDatum; weight?: number; };
type GraphData = { nodes: NodeDatum[]; links: LinkDatum[] };

interface Props {
  dataUrl: string;
  height?: number;
  minRadius?: number;
  maxRadius?: number;
}

// --- sanitize inline tooltip styles so Tailwind colors apply
const sanitizeTooltipHTML = (html: string) => {
  if (!html) return '';
  const cleaned = html.replace(/style="([^"]*)"/gi, (_m, styles: string) => {
    const filtered = styles
      .replace(/(^|;)\s*color\s*:[^;"]*;?/gi, '$1')
      .replace(/(^|;)\s*background(-color)?\s*:[^;"]*;?/gi, '$1')
      .trim()
      .replace(/^;|;$/g, '');
    return filtered ? `style="${filtered}"` : '';
  });
  return cleaned;
};

const BoardNetworkGraph: React.FC<Props> = ({
  dataUrl,
  height = 620,
  minRadius = 3,
  maxRadius = 12,
}) => {
  const wrapRef  = useRef<HTMLDivElement>(null);          // outer wrapper (tooltip attaches here)
  const frameRef = useRef<HTMLDivElement>(null);          // NEW: rounded/overflow frame for the svg
  const svgRef   = useRef<SVGSVGElement>(null);
  const zoomRef  = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const resp = await fetch(dataUrl);
        if (!resp.ok) throw new Error(`Failed to load ${dataUrl}`);
        const data: GraphData = await resp.json();
        if (!isMounted) return;

        const container = wrapRef.current!;
        const frame = frameRef.current!;                  // NEW: use frame for sizing/clipping
        const svgEl = svgRef.current!;
        if (!container || !frame || !svgEl) return;

        // Tooltip attaches to container (outer), so it's not clipped by the inner overflow
        d3.select(container).style('position', 'relative');

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = frame.clientWidth;                  // NEW: size from frame
        svg
          .attr('viewBox', `0 0 ${width} ${height}`)
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .classed('select-none', true)
          .style('width', '100%')
          .style('height', `${height}px`)
          .style('background', 'transparent')
          .style('display', 'block'); // avoids whitespace below inline SVG

        const isDark = document.documentElement.classList.contains('dark');
        const nodeStroke = isDark ? '#0B1220' : '#ffffff';
        const labelFill  = isDark ? '#E2E8F0' : '#0F172A';
        const haloFill   = isDark ? '#0B1220' : '#ffffff';

        // Tooltip with Tailwind colors
        const tooltip = d3.select(container)
          .append('div')
          .attr('class', [
            'pointer-events-none absolute z-20',
            'rounded-xl border px-3 py-2 text-xs shadow-lg backdrop-blur',
            'bg-white/95 text-slate-900 border-slate-200',
            'dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700',
            'text-right'
          ].join(' '))
          .attr('dir', 'auto')
          .style('opacity', '0')
          .style('transform', 'translate(-50%, -120%)');

        const g = svg.append('g');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 8])
          .on('zoom', (event) => {
            g.attr('transform', event.transform);
            const k = event.transform.k;
            labels.attr('opacity', k > 1.6 ? 0.9 : 0);
          });

        // Attach zoom (enables drag, pinch, dblclick)
        svg.call(zoom);
        zoomRef.current = zoom;

        // Remove D3's default wheel handler only (keeps the rest)
        svg.on('wheel.zoom', null as any);

        // Custom animated wheel-zoom (trackpad/mouse)
        // Uses cubic easing + small step to feel smooth across devices
        svg.on('wheel.smooth', (event: any) => {
        event.preventDefault();
        const we = event as WheelEvent;

        // Where the mouse is (zoom around pointer)
        const p = d3.pointer(event, svgEl);

        // Normalize wheel delta across devices
        // deltaMode: 0=pixels, 1=lines, 2=pages
        const LINE_HEIGHT = 16;
        const deltaY = we.deltaMode === 1 ? we.deltaY * LINE_HEIGHT
                    : we.deltaMode === 2 ? we.deltaY * LINE_HEIGHT * 24
                    : we.deltaY;

        // Negative -> zoom in; Positive -> zoom out
        const intensity = we.ctrlKey ? 0.0012 : 0.0022; // ctrlKey=precision trackpad/pinch
        const k = Math.pow(2, -deltaY * intensity);

        // Animate the scale change around the pointer
        svg.interrupt();

        svg
            .transition()
            .duration(180)
            .ease(d3.easeCubicOut)
            .call(zoom.scaleBy as any, k, p);
        });

        // Optional: smoother double-click zoom
        svg.on('dblclick.zoom', (event: any) => {
        const p = d3.pointer(event, svgEl);
        const t = d3.zoomTransform(svgEl);
        const factor = event.shiftKey ? 1 / 1.6 : 1.6;
        const newK = Math.max(0.1, Math.min(8, t.k * factor));
        const newTransform = d3.zoomIdentity
            .translate(p[0], p[1])
            .scale(newK)
            .translate(-p[0], -p[1]);

        svg
            .transition()
            .duration(240)
            .ease(d3.easeCubicOut)
            .call(zoom.transform, newTransform);
        });

        // Sizes
        const sizes = data.nodes.map(n => n.size ?? 8);
        const sMin = Math.max(1, d3.min(sizes) ?? 1);
        const sMax = Math.max(sMin + 1, d3.max(sizes) ?? 20);
        const r = d3.scaleSqrt().domain([sMin, sMax]).range([minRadius, maxRadius]);

        // higher-contrast palette
        let linkColor = isDark ? '#C7D2FE' /* indigo-200 */ : '#475569' /* slate-600 */;
        let haloColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(2,6,23,0.12)';
        let linkOpacity = isDark ? 0.92 : 0.9;

        // group for links with rounded ends
        const linksGroup = g.append('g')
          .attr('class', 'links')
          .attr('stroke-linecap', 'round');

        // “halo” underlay makes links readable on any background
        const linkHalo = linksGroup.selectAll('line.halo')
          .data(data.links)
          .join('line')
          .attr('class', 'halo')
          .attr('stroke', haloColor)
          .attr('stroke-opacity', 1)
          .attr('vector-effect', 'non-scaling-stroke')  // keep thickness constant when zooming
          .style('pointer-events', 'none')
          .attr('stroke-width', l => {
            const w = Math.max(0.5, Math.min(3, (l.weight ?? 1) * 0.6));
            return w + 2; // a bit wider than the link
          });

        // the actual link line on top
        const link = linksGroup.selectAll('line.link')
          .data(data.links)
          .join('line')
          .attr('class', 'link')
          .attr('stroke', linkColor)
          .attr('stroke-opacity', linkOpacity)
          .attr('vector-effect', 'non-scaling-stroke')  // stays readable at any zoom
          .style('pointer-events', 'none')
          .attr('stroke-width', l => Math.max(0.8, Math.min(3.5, (l.weight ?? 1) * 0.7)));


        // Nodes
        const node = g.append('g')
          .selectAll<SVGGElement, NodeDatum>('g.node')
          .data(data.nodes)
          .join('g')
          .attr('class', 'node')
          .call(
            d3.drag<SVGGElement, NodeDatum>()
              .on('start', (event: D3DragEvent<SVGGElement, NodeDatum, unknown>, d) => {
                // ⬅️ ensure the sim wakes up even if it had stopped
                sim.alpha(0.6).restart();
                d.fx = d.x; 
                d.fy = d.y;
              })
              .on('drag', (event: D3DragEvent<SVGGElement, NodeDatum, unknown>, d) => {
                d.fx = event.x; 
                d.fy = event.y;
              })
              .on('end', (event: D3DragEvent<SVGGElement, NodeDatum, unknown>, d) => {
                d.fx = null; 
                d.fy = null;
              })
          );
        node.append('circle')
          .attr('r', d => r(d.size ?? 8))
          .attr('fill', d => d.color ?? (isDark ? '#38BDF8' : '#0EA5E9'))
          .attr('stroke', nodeStroke)
          .attr('stroke-width', 1.2);

        const labels = node.append('text')
          .text(d => d.label ?? d.id)
          .attr('x', d => r(d.size ?? 8) + 3)
          .attr('y', 3)
          .attr('font-size', 11)
          .attr('opacity', 0)
          .attr('fill', labelFill)
          .attr('paint-order', 'stroke')
          .attr('stroke', haloFill)
          .attr('stroke-width', 3);

        let raf = 0;
        node
          .on('mouseenter', (_event, d) => {
            const html = d.title ? sanitizeTooltipHTML(d.title) : `<strong>${d.label ?? d.id}</strong>`;
            tooltip.style('opacity', '1').html(html);
          })
          .on('mousemove', (event) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
              const [x, y] = d3.pointer(event, container);
              tooltip.style('left', `${x}px`).style('top', `${y - 16}px`);
              raf = 0;
            });
          })
          .on('mouseleave', () => {
            if (raf) cancelAnimationFrame(raf), (raf = 0);
            tooltip.style('opacity', '0');
          });

        // Simulation
        const sim = d3.forceSimulation<NodeDatum>(data.nodes)
          .alpha(1)                  // start energetic
          .alphaMin(0.03)            // stop a bit earlier (default ~0.001)
          .alphaDecay(0.06)          // decay faster than default ~0.0228
          .velocityDecay(0.35)       // slightly more damping (default 0.4)
          .force('link', d3.forceLink<NodeDatum, LinkDatum>(data.links)
            .id(d => d.id)
            .distance(40)
            .strength(0.6))
          .force('charge', d3.forceManyBody<NodeDatum>()
            .strength(-30)
            .theta(0.9)              // Barnes–Hut approximation (perf)
            .distanceMax(180))       // skip far interactions (perf)
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide<NodeDatum>()
            .radius(d => r(d.size ?? 8) + 2));

        sim.on('tick', () => {
          link
            .attr('x1', d => (d.source as NodeDatum).x ?? 0)
            .attr('y1', d => (d.source as NodeDatum).y ?? 0)
            .attr('x2', d => (d.target as NodeDatum).x ?? 0)
            .attr('y2', d => (d.target as NodeDatum).y ?? 0);

          linkHalo
            .attr('x1', d => (d.source as NodeDatum).x ?? 0)
            .attr('y1', d => (d.source as NodeDatum).y ?? 0)
            .attr('x2', d => (d.target as NodeDatum).x ?? 0)
            .attr('y2', d => (d.target as NodeDatum).y ?? 0);

          node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

        sim.on('end', () => {
          // Optional: explicitly stop the sim to save CPU once layout is stable.
          // If you want it fully stopped, uncomment the next line:
          // sim.stop();
        });

        // Resize (observe frame, not outer wrapper)
        const ro = new ResizeObserver(([entry]) => {
          const w = entry.contentRect.width;
          svg.attr('viewBox', `0 0 ${w} ${height}`);
          sim.force('center', d3.forceCenter(w / 2, height / 2) as any).alpha(0.2).restart();
        });
        ro.observe(frame);

        setLoading(false);

        const themeObs = new MutationObserver(() => {
          const darkNow = document.documentElement.classList.contains('dark');
          link
            .attr('stroke', darkNow ? '#C7D2FE' : '#475569')
            .attr('stroke-opacity', darkNow ? 0.92 : 0.85);
          linkHalo
            .attr('stroke', darkNow ? 'rgba(255,255,255,0.15)' : 'rgba(2,6,23,0.12)');
        });
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        cleanup = () => {
          ro.disconnect();
          themeObs.disconnect();
          sim.stop();
          tooltip.remove();
          svg.selectAll('*').remove();
        };
      } catch (e: any) {
        if (isMounted) {
          setErr(e?.message || 'Failed to load network');
          setLoading(false);
        }
      }
    })();

    return () => { isMounted = false; cleanup?.(); };
  }, [dataUrl, height, minRadius, maxRadius]);

    const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    };
    
    return (
  <div ref={wrapRef} className="relative">
    {/* Outer card (rounded + visible edge) */}
    <div className="relative rounded-2xl bg-white/95 dark:bg-slate-900/90 ring-1 ring-slate-200 dark:ring-slate-800 shadow-lg">
      {/* Inner frame: actually clips the SVG and the loading layer */}
      <div ref={frameRef} className="relative rounded-2xl overflow-hidden">
        <svg ref={svgRef} style={{ touchAction: 'none', display: 'block' }} />

        {/* Put the loading layer INSIDE the clipped frame */}
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm">
            Loading network…
          </div>
        )}
      </div>

      {/* Controls (stay outside the clipped frame so they aren’t cropped) */}
      <div className="absolute right-3 top-3 flex gap-2">
        <button
          className="text-xs px-2 py-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-80 transition-opacity"
          onClick={handleReset}
          title="Reset view"
        >
          Reset
        </button>
      </div>

      {/* Errors live below the frame */}
      {err && <div className="p-4 text-red-600 text-sm">{err}</div>}
    </div>
  </div>
);
}
export default BoardNetworkGraph;
