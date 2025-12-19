// data.js

const FILES = [
  'data/cleaned_spotify_data.json',
];

export async function loadAllData(statusCallback) {
  statusCallback('Loading files...');
  try {
    const promises = FILES.map(f => fetch(f).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(err => { console.warn('Failed', f, err); return []; }));

    const results = await Promise.all(promises);
    let allRecords = results.flat();

    // Filter valid tracks
    allRecords = allRecords.filter(d => d.spotify_track_uri);
    
    // Parse Dates once
    allRecords = allRecords.map(d => ({
      ...d,
      ts: d.ts ? new Date(d.ts) : null
    })).filter(d => d.ts);

    statusCallback(`Loaded ${allRecords.length} records`);
    return allRecords;
  } catch (e) {
    console.error(e);
    statusCallback('Error loading data.');
    return [];
  }
}

export function filterRecords(records, { startYear, endYear, query }) {
  const q = query ? query.trim().toLowerCase() : '';
  return records.filter(r => {
    const y = r.ts.getUTCFullYear();
    if (y < startYear || y > endYear) return false;
    
    const artist = r.master_metadata_album_artist_name;
    if (!artist) return false;
    
    if (q && !artist.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function aggregateByArtist(records, start, end) {
  const map = new Map();
  const yearsList = [];
  for (let y = start; y <= end; y++) yearsList.push(y);

  for (const r of records) {
    const name = r.master_metadata_album_artist_name || 'Unknown Artist';
    const ms = r.ms_played || 0;
    const yr = r.ts.getUTCFullYear();

    if (!map.has(name)) {
      map.set(name, { 
        artist: name, 
        ms_played: 0, 
        plays: 0, 
        years: {}, 
        tracks: new Map() // trackUri -> count mapping
      });
    }
    const entry = map.get(name);
    entry.ms_played += ms;
    entry.plays += 1;
    entry.years[yr] = (entry.years[yr] || 0) + ms;
  }

  return Array.from(map.values()).map(e => {
    const yearValues = {};
    let totalMs = 0;
    
    // Calculate raw hours per year
    for (const y of yearsList) {
      const ms = e.years[y] || 0;
      yearValues[y] = ms / 3600000;
      totalMs += ms;
    }

    // Calculate Adjusted Hours (Exponential Decay)
    const adjusted_years = {};
    let adjustedHours = 0;
    for (const y of yearsList) {
      const diff = end - y;
      // Fixed logic: if diff is 0, weight is 1.
      const weight = diff >= 0 ? Math.exp(-0.725 * Math.log(Math.max(1, diff))) : 1;
      adjusted_years[y] = (yearValues[y] || 0) * weight;
      adjustedHours += adjusted_years[y];
    }

    return {
      artist: e.artist,
      plays: e.plays,
      totalHours: totalMs / 3600000,
      adjustedHours,
      adjusted_years,
      years: yearValues
    };
  });
}

export function computeAlbumAggregation(records, artist, year) {
  const map = new Map();
  for (const r of records) {
    if (artist && r.master_metadata_album_artist_name !== artist) continue;
    const rYear = r.ts.getUTCFullYear();
    if (year !== null && rYear !== undefined && rYear !== year) continue;
    const album = r.master_metadata_album_album_name || 'Unknown Album';
    const ms = r.ms_played || 0;
    if (!map.has(album)) map.set(album, { album, ms: 0, trackUri: r.spotify_track_uri, artist: r.master_metadata_album_artist_name, plays: 0 });
    const entry = map.get(album);
    entry.ms += ms;
    entry.plays += 1;
  }
  return Array.from(map.values())
    .map(d => ({ ...d, hours: d.ms / 3600000 }))
    .sort((a, b) => b.hours - a.hours);
}

export function getTopTracks(records, artist, year = null) {
  const map = new Map();
  for (const r of records) {
    if (r.master_metadata_album_artist_name !== artist) continue;
    if (year !== null && r.ts.getUTCFullYear() !== year) continue;

    const track = r.master_metadata_track_name || 'Unknown Track';
    if (!map.has(track)) map.set(track, { name: track, count: 0, uri: r.spotify_track_uri });
    map.get(track).count++;
  }
  return Array.from(map.values()).sort((a,b) => b.count - a.count).slice(0, 10);
}