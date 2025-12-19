// --- Cumulative Hours Listened Stacked Area Chart by Album ---
export function renderArtistAlbumCumulative(containerId, records, artistName, sharedX, onZoom) {
  const container = d3.select(containerId);
  container.selectAll('*').remove();
  if (records.length === 0) {
    container.html('<em>No data for cumulative chart.</em>');
    return;
  }
  // Aggregate by week and album
  const weekAlbumMap = new Map();
  records.forEach(r => {
    const d = new Date(r.ts);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    const weekKey = d.getTime();
    const album = r.master_metadata_album_album_name || 'Unknown Album';
    if (!weekAlbumMap.has(weekKey)) weekAlbumMap.set(weekKey, {});
    if (!weekAlbumMap.get(weekKey)[album]) weekAlbumMap.get(weekKey)[album] = 0;
    weekAlbumMap.get(weekKey)[album] += (r.ms_played/3600000);
  });
  // Prepare data for stack
  const weeks = Array.from(weekAlbumMap.keys()).sort((a,b) => a-b);
  const albums = Array.from(new Set(records.map(r => r.master_metadata_album_album_name || 'Unknown Album')));
  const stackData = weeks.map(weekKey => {
    const entry = { week: new Date(Number(weekKey)) };
    albums.forEach(album => {
      entry[album] = weekAlbumMap.get(weekKey)[album] || 0;
    });
    return entry;
  });
  // Cumulative sum for each album
  albums.forEach(album => {
    let cumu = 0;
    stackData.forEach(d => {
      cumu += d[album];
      d[album] = cumu;
    });
  });
  // D3 stack
  const width = container.node().clientWidth || 600;
  const height = 220;
  const margin = { left: 60, right: 40, top: 20, bottom: 40 };
  const svg = container.append('svg').attr('width', width).attr('height', height);
  const x = sharedX || d3.scaleTime().domain(d3.extent(stackData, d => d.week)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(stackData, d => albums.reduce((sum, a) => sum + d[a], 0))]).range([height - margin.bottom, margin.top]);
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(albums);
  const stackGen = d3.stack().keys(albums);
  const series = stackGen(stackData);
  // Area generator
  const area = d3.area()
    .x(d => x(d.data.week))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);
  svg.selectAll('.album-area')
    .data(series)
    .join('path')
    .attr('class', 'album-area')
    .attr('d', area)
    .attr('fill', d => color(d.key))
    .attr('opacity', 0.7)
    .on('mouseenter', (e, d) => {
      Tooltip.show(e, `<strong>${d.key}</strong>`);
    })
    .on('mouseleave', Tooltip.hide);
  // Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(5);
  svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height-margin.bottom})`).call(xAxis);
  svg.append('g').attr('transform', `translate(${margin.left},0)`).call(yAxis);
  // Zoom handler
  function zoomed(event) {
    const t = event.transform;
    const zx = t.rescaleX(x);
    svg.selectAll('.album-area').attr('d', area.x(d => zx(d.data.week)));
    svg.select('.x-axis').call(xAxis.scale(zx));
    if (onZoom) onZoom(zx);
  }
  const zoom = d3.zoom().scaleExtent([1, 20]).translateExtent([[margin.left, 0], [width - margin.right, height]]).extent([[margin.left, 0], [width - margin.right, height]]).on('zoom', zoomed);
  svg.call(zoom);
  // Legend (move below chart, horizontal)
  svg.append('text').attr('x',margin.left).attr('y',margin.top-6).text('Cumulative Hours Listened by Album').attr('fill','#c9d1d9').attr('font-size','15px').attr('font-weight','bold');
  // Render legend below chart, outside SVG, with click-to-filter
  let legendHtml = '<div id="albumCumuLegend" style="display:flex;flex-wrap:wrap;align-items:center;margin-top:8px;gap:18px;">';
  albums.forEach(album => {
    legendHtml += `<span class="cumu-legend-item" data-album="${album}" style="display:flex;align-items:center;gap:6px;cursor:pointer;"><span style="display:inline-block;width:16px;height:16px;background:${color(album)};opacity:0.7;border-radius:3px;"></span><span style="color:#c9d1d9;font-size:13px;">${album}</span></span>`;
  });
  legendHtml += '</div>';
  container.node().insertAdjacentHTML('beforeend', legendHtml);

  // Legend click handler for filtering
  const legendDiv = container.select('#albumCumuLegend').node();
  let focusedAlbum = null;
  legendDiv.querySelectorAll('.cumu-legend-item').forEach(item => {
    item.addEventListener('click', () => {
      const album = item.getAttribute('data-album');
      if (focusedAlbum === album) {
        // Unfocus, show all
        focusedAlbum = null;
        renderArtistAlbumCumulative(containerId, records, artistName, sharedX, onZoom);
        // Reset side-panel to standard artist view
        if (window && window.updateArtistSidePanel) window.updateArtistSidePanel(null, records, artistName);
      } else {
        // Focus on this album
        focusedAlbum = album;
        // Filter stackData to only this album
        const filteredAlbums = [album];
        // Re-render chart with only this album
        // ...aggregate by week and album (repeat logic)...
        const weekAlbumMap = new Map();
        records.forEach(r => {
          const d = new Date(r.ts);
          d.setHours(0,0,0,0);
          d.setDate(d.getDate() - d.getDay());
          const weekKey = d.getTime();
          const a = r.master_metadata_album_album_name || 'Unknown Album';
          if (!weekAlbumMap.has(weekKey)) weekAlbumMap.set(weekKey, {});
          if (!weekAlbumMap.get(weekKey)[a]) weekAlbumMap.get(weekKey)[a] = 0;
          weekAlbumMap.get(weekKey)[a] += (r.ms_played/3600000);
        });
        const weeks = Array.from(weekAlbumMap.keys()).sort((a,b) => a-b);
        const stackData = weeks.map(weekKey => {
          const entry = { week: new Date(Number(weekKey)) };
          filteredAlbums.forEach(a => {
            entry[a] = weekAlbumMap.get(weekKey)[a] || 0;
          });
          return entry;
        });
        filteredAlbums.forEach(a => {
          let cumu = 0;
          stackData.forEach(d => {
            cumu += d[a];
            d[a] = cumu;
          });
        });
        // D3 stack
        const node = d3.select(containerId).node();
        const width = (node && node.clientWidth) ? node.clientWidth : 600;
        const height = 220;
        const margin = { left: 60, right: 40, top: 20, bottom: 40 };
        const svg = d3.select(containerId).select('svg');
        const x = sharedX || d3.scaleTime().domain(d3.extent(stackData, d => d.week)).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, d3.max(stackData, d => filteredAlbums.reduce((sum, a) => sum + d[a], 0))]).range([height - margin.bottom, margin.top]);
        const color = d3.scaleOrdinal(d3.schemeTableau10).domain(filteredAlbums);
        const stackGen = d3.stack().keys(filteredAlbums);
        const series = stackGen(stackData);
        // Area generator
        const area = d3.area()
          .x(d => x(d.data.week))
          .y0(d => y(d[0]))
          .y1(d => y(d[1]))
          .curve(d3.curveMonotoneX);
        svg.selectAll('.album-area').remove();
        svg.selectAll('.x-axis').remove();
        svg.selectAll('g').remove();
        svg.append('g').selectAll('.album-area')
          .data(series)
          .join('path')
          .attr('class', 'album-area')
          .attr('d', area)
          .attr('fill', d => color(d.key))
          .attr('opacity', 0.7);
        // Axes
        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y).ticks(5);
        svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height-margin.bottom})`).call(xAxis);
        svg.append('g').attr('transform', `translate(${margin.left},0)`).call(yAxis);
        // Update side-panel with tracks for this album
        if (window && window.updateArtistSidePanel) {
          const albumRecords = records.filter(r => (r.master_metadata_album_album_name || 'Unknown Album') === album);
          window.updateArtistSidePanel(album, albumRecords, artistName);
        }
      }
    });
  });
}
// charts.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// --- Shared Tooltip Singleton ---
const tooltip = d3.select('body').append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

const Tooltip = {
  show(event, htmlContent) {
    tooltip.transition().duration(200).style('opacity', 1);
    tooltip.html(htmlContent)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY + 15) + 'px');
  },
  hide() {
    tooltip.transition().duration(200).style('opacity', 0);
  }
};

// --- Stacked Bar Chart (Overview) ---
export function renderBarChart(containerId, data, startYear, endYear, useAdjusted, onBarClick) {
  const container = d3.select(containerId);
  const node = container.node();

  container.selectAll('*').remove(); // Clear previous

  const margin = { top: 30, right: 20, bottom: 30, left: 160 };
  const width = Math.max(800, node.parentNode.clientWidth) - margin.left - margin.right;
  const barHeight = 24;
  const height = Math.max(400, data.length * barHeight);

  const svg = container
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Scales
  const years = d3.range(startYear, endYear + 1).map(String);
  const color = d3.scaleSequential(d3.interpolateSpectral).domain([startYear, endYear]); // Simplified color
  
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => useAdjusted ? d.adjustedHours : d.totalHours) + 24 || 1])
    .range([0, width]);
  
  const y = d3.scaleBand()
    .domain(data.map(d => d.artist))
    .range([0, height])
    .padding(0.2);

  // Stack Generator
  const stack = d3.stack()
    .keys(years)
    .value((d, key) => useAdjusted ? (d.adjusted_years[key] || 0) : (d.years[key] || 0));
  
  const series = stack(data);

  // Render Bars
  g.selectAll('.layer')
    .data(series)
    .join('g')
    .attr('fill', d => color(d.key))
    .selectAll('rect')
    .data(d => d)
    .join('rect')
      .attr('y', d => y(d.data.artist))
      .attr('x', d => x(d[0]))
      .attr('width', d => x(d[1]) - x(d[0]))
      .attr('height', y.bandwidth())
      .style('cursor', 'pointer')
      .on('mouseenter', (e, d) => {
        d3.select(e.target).attr('opacity', 0.8);
        const year = d3.select(e.target.parentNode).datum().key;
        const hrs = d[1] - d[0];
        Tooltip.show(e, `<strong>${d.data.artist}</strong><br>${year}<br>${hrs.toFixed(2)} hours`);
      })
      .on('mouseleave', (e) => {
        d3.select(e.target).attr('opacity', 1);
        Tooltip.hide();
      })
      .on('click', (e, d) => {
        const year = parseInt(d3.select(e.target.parentNode).datum().key);
        onBarClick(d.data.artist, year);
      });

  // Axis & Labels
  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y)).selectAll('.tick text').attr('class', 'artistLabel');

  // Add labels (total hours and total plays) to the right of each bar
  g.selectAll('.label')
    .data(data)
    .join('text')
    .attr('x', d => x(useAdjusted ? d.adjustedHours : d.totalHours) + 5)
    .attr('y', d => y(d.artist) + y.bandwidth() / 2 + 4)
    .text(d => `${(useAdjusted ? d.adjustedHours : d.totalHours).toFixed(2)}h / ${d.plays} plays`)
    .attr('font-size', '12px')
    .attr('fill', '#c9d1d9');
}

// --- Album Pie Chart ---
export function renderAlbumPie(containerId, data) {
  const container = d3.select(containerId);
  container.selectAll('*').remove();
  
  if (data.length === 0) {
    container.html('<em>No album data available.</em>');
    return;
  }

  const width = 300, height = 200, radius = Math.min(width, height) / 2;
  const svg = container.append('svg').attr('width', width).attr('height', height)
    .append('g').attr('transform', `translate(${width/2},${height/2})`);

  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(d => d.album));
  const pie = d3.pie().value(d => d.hours).sort(null);
  const arc = d3.arc().innerRadius(0).outerRadius(radius - 10);

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.album))
    .attr('stroke', '#161b22')
    .style('stroke-width', '2px')
    .on('mouseenter', (e, d) => {
      const pct = (d.data.hours / d3.sum(data, x=>x.hours) * 100).toFixed(1);
      Tooltip.show(e, `<strong>${d.data.album}</strong><br>${d.data.hours.toFixed(1)}h (${pct}%)`);
    })
    .on('mouseleave', () => Tooltip.hide());
}

// --- Artist Timeline (Streamgraph / Density) ---
export function renderTimeline(containerId, records, artistName) {
  // Logic ported from original renderArtistTimeline
  // Enhanced: show circles for each week, tooltips with tracks, click to update side-panel
  const container = d3.select(containerId);
  container.selectAll('*').remove();

  if(records.length === 0) {
    container.html('<p>No records found.</p>');
    return;
  }

  const width = container.node().clientWidth;
  const height = 340; // Increased height for more space
  const margin = { left: 60, right: 40, top: 30, bottom: 50 }; // More generous margins
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('padding', '16px 8px 8px 8px');
  const chartG = svg.append('g');

  // Aggregate by week: { weekKey: { date, hours, records: [track records] } }
  const weekMap = new Map();
  records.forEach(r => {
    const d = new Date(r.ts);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    const key = d.getTime();
    if (!weekMap.has(key)) {
      weekMap.set(key, { date: new Date(key), hours: 0, records: [] });
    }
    const entry = weekMap.get(key);
    entry.hours += (r.ms_played/3600000);
    entry.records.push(r);
  });
  const data = Array.from(weekMap.values()).sort((a,b) => a.date - b.date);

  // Find first play date for this artist
  let firstPlay = null;
  if (records.length > 0) {
    firstPlay = records.reduce((min, r) => (!min || r.ts < min.ts) ? r : min, null);
  }

  // Scales
  // Add small padding to x min and x max
  let x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.hours)]).range([height - margin.bottom, margin.top]);

  // Area Path
  const area = d3.area()
    .x(d => x(d.date))
    .y0(height - margin.bottom)
    .y1(d => y(d.hours))
    .curve(d3.curveMonotoneX);

  const areaPath = chartG.append('path')
    .datum(data)
    .attr('fill', 'rgba(31, 111, 235, 0.2)')
    .attr('stroke', '#1f6feb')
    .attr('stroke-width', 2)
    .attr('d', area);

  // Circles for each week
  const circles = chartG.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.hours))
    .attr('r', 7)
    .attr('fill', '#e2b340')
    .attr('stroke', '#1f6feb')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => {
      // Compose tooltip HTML with tracks played that week
      const tracks = d.records
        .reduce((acc, r) => {
          const key = r.master_metadata_track_name || 'Unknown Track';
          if (!acc[key]) acc[key] = { name: key, count: 0, uri: r.spotify_track_uri };
          acc[key].count++;
          return acc;
        }, {});
      const trackList = Object.values(tracks)
        .sort((a,b) => b.count - a.count)
        .map(t => `<div><a href="#" class="trackLink" data-uri="${t.uri}">${t.name}</a> (${t.count})</div>`)
        .join('');
      Tooltip.show(event, `<strong>${d.date.toLocaleDateString()}</strong><br>${d.hours.toFixed(2)} hours<br><u>Tracks:</u><br>${trackList}`);
    })
    .on('mouseleave', () => Tooltip.hide())
    .on('click', (event, d) => {
      // Update side-panel with tracks for this week
      if (window && window.updateArtistWeekDetails) {
        window.updateArtistWeekDetails(d);
      }
    });

  // Anchored vertical line for first play
  let firstLine = null, firstLabel = null;
  if (firstPlay) {
    const firstDate = new Date(firstPlay.ts);
    firstLine = chartG.append('line')
      .attr('x1', x(firstDate))
      .attr('x2', x(firstDate))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#e34c26')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3');
    firstLabel = chartG.append('text')
      .attr('x', x(firstDate) + 6)
      .attr('y', margin.top + 16)
      .attr('fill', '#e34c26')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('First Play: ' + firstDate.toLocaleDateString());
  }

  // Axes
  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).ticks(5);
  const xAxisG = chartG.append('g').attr('transform', `translate(0,${height-margin.bottom})`).call(xAxis);
  const yAxisG = chartG.append('g').attr('transform', `translate(${margin.left},0)`).call(yAxis);

  // D3 Zoom/Pan
  function zoomed(event) {
    const t = event.transform;
    // Rescale x
    const zx = t.rescaleX(x);
    // Update area
    areaPath.attr('d', area.x(d => zx(d.date)));
    // Update circles
    circles.attr('cx', d => zx(d.date));
    // Update first play line and label
    if (firstPlay) {
      const firstDate = new Date(firstPlay.ts);
      firstLine.attr('x1', zx(firstDate)).attr('x2', zx(firstDate));
      firstLabel.attr('x', zx(firstDate) + 6);
    }
    // Update x axis
    xAxisG.call(xAxis.scale(zx));
  }
  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on('zoom', zoomed);
  svg.call(zoom);
}

// --- Year Heatmap ---
export function renderHeatmap(containerId, records, year) {
  const container = d3.select(containerId);
  container.selectAll('*').remove();

  const cellSize = 12;
  const width = 7 * (cellSize + 2) + 20; // 7 days wide
  const height = 53 * (cellSize + 2) + 50; // 53 weeks tall

  const svg = container.append('svg').attr('width', width).attr('height', height);

  // Data map: "YYYY-MM-DD" -> hours
  const dayMap = new Map();
  records.forEach(r => {
    if(r.ts.getUTCFullYear() !== year) return;
    const k = r.ts.toISOString().slice(0,10);
    dayMap.set(k, (dayMap.get(k)||0) + (r.ms_played/3600000));
  });

  const maxH = Math.max(...dayMap.values()) || 1;
  const color = d3.scaleSequential(d3.interpolateInferno).domain([0, maxH]);

  const days = d3.timeDays(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)));

  svg.selectAll('rect')
    .data(days)
    .join('rect')
    .attr('width', cellSize)
    .attr('height', cellSize)
    .attr('x', d => d.getUTCDay() * (cellSize + 2) + 10)
    .attr('y', d => d3.utcWeek.count(d3.utcYear(d), d) * (cellSize + 2) + 30)
    .attr('fill', d => {
      const val = dayMap.get(d.toISOString().slice(0,10));
      return val ? color(val) : '#21262d';
    })
    .on('mouseenter', (e, d) => {
      const k = d.toISOString().slice(0,10);
      const val = dayMap.get(k) || 0;
      Tooltip.show(e, `${k}<br>${val.toFixed(2)} hours`);
    })
    .on('mouseleave', Tooltip.hide);

  // Simple Month Labels (now vertical)
  // Place month labels on the left of the first week of each month
  const months = d3.timeMonths(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)));
  months.forEach(m => {
    const weekNum = d3.utcWeek.count(d3.utcYear(m), m);
    svg.append('text')
      .attr('x', 0)
      .attr('y', weekNum * (cellSize + 2) + 40)
      .text(m.toLocaleString('default', { month: 'short' }))
      .attr('fill', '#8b949e')
      .attr('font-size', '10px');
  });
}