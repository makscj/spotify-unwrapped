// Show Album Details in Side Panel (monthly breakdown)
function showAlbumDetails(albumName, year) {
  // Filter records for this album and year
  const records = state.allRecords.filter(r => {
    return r.master_metadata_album_album_name === albumName && r.ts.getUTCFullYear() === year;
  });
  if (records.length === 0) {
    els.artistInfo.innerHTML = `<h3>${albumName} (${year})</h3><p>No data for this album in ${year}.</p>`;
    return;
  }
  // Aggregate songs in this album for the year
  const songMap = new Map();
  records.forEach(r => {
    const key = r.master_metadata_track_name || 'Unknown Song';
    if (!songMap.has(key)) songMap.set(key, { name: key, ms: 0, count: 0, uri: r.spotify_track_uri });
    const entry = songMap.get(key);
    entry.ms += r.ms_played || 0;
    entry.count++;
  });
  const songs = Array.from(songMap.values()).sort((a, b) => b.ms - a.ms);

  // Build HTML for song list and heatmap
  let html = `<h3>${albumName} (${year})</h3>`;
  html += `<h4>Songs in Album</h4>`;
  html += `<ul class="album-song-list" style="margin-bottom:10px;">`;
  songs.forEach(song => {
    html += `<li><a href="#" class="album-song-link" data-uri="${song.uri}">${song.name}</a> <span style='color:#8b949e;font-size:0.92em;margin-left:6px;'>${(song.ms/3600000).toFixed(2)}h / ${song.count}p</span></li>`;
  });
  html += `</ul>`;
  html += `<h4>Album Listening Heatmap</h4>`;
  html += `<div id="albumHeatmap"></div>`;
  els.artistInfo.innerHTML = html;
  // Song link click events
  els.artistInfo.querySelectorAll('.album-song-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const uri = link.getAttribute('data-uri');
      const name = link.textContent;
      showSongDetails({ name, uri, album: albumName }, year);
    });
  });
  // Render heatmap for just this album's records
  Charts.renderHeatmap('#albumHeatmap', records, year);
}

// Show Song Details in Side Panel and Player
function showSongDetails(songObj, year) {
  // songObj: { name, uri, album, artist, count, ms }
  if (!songObj || !songObj.uri) return;
  // Find all records for this song in the year
  const records = state.allRecords.filter(r => r.spotify_track_uri === songObj.uri && r.ts.getUTCFullYear() === year);
  const totalMs = records.reduce((sum, r) => sum + (r.ms_played || 0), 0);
  const totalPlays = records.length;
  // Percent of year
  const yearTotalMs = state.allRecords.filter(r => r.ts.getUTCFullYear() === year).reduce((sum, r) => sum + (r.ms_played || 0), 0);
  const percentYear = yearTotalMs ? (totalMs / yearTotalMs * 100) : 0;
  // Percent of artist
  // let percentArtist = 0;
  // if (records.length > 0) {
  //   const artist = records[0].master_metadata_album_artist_name;
  //   const artistMs = state.allRecords.filter(r => r.master_metadata_album_artist_name === artist && r.ts.getUTCFullYear() === year).reduce((sum, r) => sum + (r.ms_played || 0), 0);
  //   percentArtist = artistMs ? (totalMs / artistMs * 100) : 0;
  // }
  // Percent by month
  // const monthPercents = Array(12).fill(0);
  // for (let m = 0; m < 12; m++) {
  //   const monthMs = records.filter(r => r.ts.getUTCMonth() === m).reduce((sum, r) => sum + (r.ms_played || 0), 0);
  //   const monthTotal = state.allRecords.filter(r => r.ts.getUTCFullYear() === year && r.ts.getUTCMonth() === m).reduce((sum, r) => sum + (r.ms_played || 0), 0);
  //   monthPercents[m] = monthTotal ? (monthMs / monthTotal * 100) : 0;
  // }
  // // Build HTML
  // let html = `<h3>${songObj.name} (${year})</h3>`;
  // html += `<p><strong>${(totalMs/3600000).toFixed(2)} hours</strong> • <strong>${totalPlays} plays</strong></p>`;
  // html += `<ul>`;
  // html += `<li><b>${percentYear.toFixed(2)}%</b> of all listening time this year</li>`;
  // html += `<li><b>${percentArtist.toFixed(2)}%</b> of all time spent on this artist this year</li>`;
  // html += `</ul>`;
  // html += `<h4>Monthly Percent of All Listening</h4><ul class="song-monthly-pct">`;
  // monthPercents.forEach((pct, m) => {
  //   html += `<li>${new Date(year, m).toLocaleString('default', { month: 'short' })}: <b>${pct.toFixed(2)}%</b></li>`;
  // });
  // html += `</ul>`;
  // els.artistInfo.innerHTML = html;
  // Load player in sticky header
  if (songObj.uri) {
    const id = songObj.uri.split(':').pop();
    els.stickyPlayer.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
  }
}
// main.js

import * as Data from './data.js';
import * as Charts from './charts.js';

// --- Modal for Data Upload ---
function showDataUploadModal(onDataLoaded) {
  // Create modal elements
  let modal = document.createElement('div');
  modal.id = 'dataUploadModal';
  modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(20,23,28,0.96);z-index:9999;display:flex;align-items:center;justify-content:center;';
  let box = document.createElement('div');
  box.style = 'background:#16181d;padding:32px 28px 24px 28px;border-radius:12px;max-width:420px;width:95vw;box-shadow:0 4px 32px #0008;color:#e6e6e6;';
  box.innerHTML = `
    <h2 style="margin-top:0">Load Your Spotify Data</h2>
    <p style="font-size:1.05em;line-height:1.6;margin-bottom:18px;">To use this app, you need your <b>Spotify Extended Listening History</b> data.<br><br>
    <b>How to get it:</b><br>
    1. Go to <a href='https://www.spotify.com/account/privacy/' target='_blank' style='color:#1db954;'>Spotify Privacy Settings</a>.<br>
    2. Request your data and wait for the email from Spotify.<br>
    3. Download the ZIP, extract it, and find <b>Streaming_History_*.json</b> files<br>
    4. <b>Optionally</b>, combine all those files into one JSON array, using the data_clean.py script in the repo.<br><br>
    <b>Upload your JSON file below:</b></p>
    <input type="file" id="spotifyJsonInput" accept="application/json" style="margin-bottom:18px;" multiple/>
    <div id="modalError" style="color:#e74c3c;margin-bottom:10px;display:none;"></div>
    <button id="modalLoadBtn" style="background:#1db954;color:#fff;padding:8px 22px;border:none;border-radius:5px;font-size:1.1em;cursor:pointer;">Load Data</button>
  `;
  modal.appendChild(box);
  document.body.appendChild(modal);

  let fileInput = box.querySelector('#spotifyJsonInput');
  let loadBtn = box.querySelector('#modalLoadBtn');
  let errorDiv = box.querySelector('#modalError');
  let allFileData = [];
  let filesLoaded = 0;

  fileInput.addEventListener('change', (e) => {
    allFileData = [];
    filesLoaded = 0;
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          let parsed = JSON.parse(evt.target.result);
          // Accept either array or object with array property
          if (!Array.isArray(parsed)) parsed = parsed?.records || [];
          allFileData[idx] = parsed;
          errorDiv.style.display = 'none';
        } catch (err) {
          errorDiv.textContent = 'Invalid JSON in one of the files.';
          errorDiv.style.display = 'block';
          allFileData[idx] = null;
        }
        filesLoaded++;
      };
      reader.readAsText(file);
    });
  });

  loadBtn.addEventListener('click', () => {
    const files = Array.from(fileInput.files);
    if (!files.length) {
      errorDiv.textContent = 'Please select at least one JSON file.';
      errorDiv.style.display = 'block';
      return;
    }
    // Wait for all files to be loaded
    if (filesLoaded < files.length) {
      errorDiv.textContent = 'Still loading files, please wait...';
      errorDiv.style.display = 'block';
      return;
    }
    // Flatten and filter out any nulls
    let combined = allFileData.filter(Boolean).flat();
    if (!combined.length) {
      errorDiv.textContent = 'No valid records found in the selected files.';
      errorDiv.style.display = 'block';
      return;
    }
    document.body.removeChild(modal);
    onDataLoaded(combined);
  });
}

// --- State ---
const state = {
  allRecords: [],
  view: 'overview', // 'overview' | 'yearDeepDive' | 'artistDeepDive'
  config: {
    minYear: 2013,
    maxYear: 2025
  }
};

// --- UI Elements ---
const els = {
  startYear: document.getElementById('startYear'),
  endYear: document.getElementById('endYear'),
  deepYear: document.getElementById('deepYear'),
  topN: document.getElementById('topN'),
  artistSearch: document.getElementById('artistSearch'),
  useAdjusted: document.getElementById('useAdjusted'),
  viewSelect: document.getElementById('viewSelect'),
  updateBtn: document.getElementById('updateBtn'),
  status: document.getElementById('status'),
  deepDiveSort: document.getElementById('deepDiveSort'),
  
  // Containers
  overviewChart: document.getElementById('overviewChart'),
  deepContainer: document.getElementById('deepViewContainer'),
  timelineContainer: document.getElementById('artistTimelineContainer'),
  artistInfo: document.getElementById('artistInfo'),
  stickyPlayer: document.getElementById('stickyPlayer'),
};


// --- Initialization ---
async function init() {
  populateYearSelects();

  // Check for ?useCache=1 in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('useCache') === '1') {
    // Use cached data (loadAllData as before)
    state.allRecords = await Data.loadAllData((msg) => els.status.textContent = msg);
    updateView();
    setupUIListeners();
  } else {
    // Prompt user to upload their own JSON data
    showDataUploadModal(async (userData) => {
      // Accept either an array or an object with array property
      let records = Array.isArray(userData) ? userData : (userData?.records || []);
      // Convert date strings to Date objects for compatibility
      records.forEach(r => {
        if (r.ts && typeof r.ts === 'string') r.ts = new Date(r.ts);
      });
      state.allRecords = records;
      updateView();
      setupUIListeners();
    });
  }
}

function setupUIListeners() {
  els.updateBtn.addEventListener('click', updateView);
  els.viewSelect.addEventListener('change', (e) => switchView(e.target.value));
  els.deepYear.addEventListener('change', updateView);
  els.artistSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') updateView();
  });
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('trackLink')) {
      e.preventDefault();
      playTrack(e.target.dataset.uri);
    }
  });
}

function populateYearSelects() {
  const { minYear, maxYear } = state.config;
  const createOpt = (y) => `<option value="${y}">${y}</option>`;
  const opts = [];
  for(let y = maxYear; y >= minYear; y--) opts.push(createOpt(y));
  
  els.startYear.innerHTML = opts.join('');
  els.endYear.innerHTML = opts.join('');
  els.deepYear.innerHTML = opts.join('');
  
  // Defaults
  els.startYear.value = maxYear - 2;
  els.endYear.value = maxYear;
  els.deepYear.value = maxYear;
}

function switchView(viewName) {
  state.view = viewName;
  document.body.dataset.view = viewName; // CSS handles visibility
  
  // Clear containers to avoid ghost content
  if(viewName === 'overview') {
    els.deepContainer.style.display = 'none';
    els.timelineContainer.style.display = 'none';
    document.getElementById('overviewChart').style.display = 'block';
  } else if (viewName === 'yearDeepDive') {
    document.getElementById('overviewChart').style.display = 'none';
    els.timelineContainer.style.display = 'none';
    els.deepContainer.style.display = 'block';
  } else {
    document.getElementById('overviewChart').style.display = 'none';
    els.deepContainer.style.display = 'none';
    els.timelineContainer.style.display = 'block';
  }
  
  updateView();
}

function updateView() {
  if (state.view === 'overview') {
    renderOverview();
  } else if (state.view === 'yearDeepDive') {
    renderYearDeepDive();
  } else if (state.view === 'artistDeepDive') {
    renderArtistDeepDive();
  }
}

// --- View Renderers ---

function renderOverview() {
  const start = parseInt(els.startYear.value);
  const end = parseInt(els.endYear.value);
  const useAdjusted = els.useAdjusted.checked;
  const topN = parseInt(els.topN.value);
  const query = els.artistSearch.value;

  const filtered = Data.filterRecords(state.allRecords, { startYear: start, endYear: end, query });
  const aggregated = Data.aggregateByArtist(filtered, start, end);
  
  // Sort and Slice
  aggregated.sort((a,b) => useAdjusted ? (b.adjustedHours - a.adjustedHours) : (b.totalHours - a.totalHours));
  const topData = aggregated.slice(0, topN);

  Charts.renderBarChart(els.overviewChart, topData, start, end, useAdjusted, (artist, year) => {
    showArtistDetails(artist, year);
  });
}

function renderYearDeepDive() {
  const year = parseInt(els.deepYear.value);
  // Clear columns
  document.getElementById('topArtistsList').innerHTML = '';
  document.getElementById('topAlbumsList').innerHTML = '';
  document.getElementById('topSongsList').innerHTML = '';

  // 1. Filter for year
  const yearRecords = state.allRecords.filter(r => r.ts.getUTCFullYear() === year);

  // 2. Top Artists
  const sortKey = els.deepDiveSort?.value || 'hours';
  let aggArtists = Data.aggregateByArtist(yearRecords, year, year)
    .filter(d => d.totalHours >= 0.5 || d.plays >= 10);
  if (sortKey === 'plays') {
    aggArtists = aggArtists.sort((a, b) => b.plays - a.plays);
  } else {
    aggArtists = aggArtists.sort((a, b) => b.totalHours - a.totalHours);
  }
  aggArtists = aggArtists.slice(0, 25);
  const topArtistsList = document.getElementById('topArtistsList');
  // Find max for spark lines
  const maxArtistVal = sortKey === 'plays' ? Math.max(...aggArtists.map(a => a.plays)) : Math.max(...aggArtists.map(a => a.totalHours));
  aggArtists.forEach(d => {
    const val = sortKey === 'plays' ? d.plays : d.totalHours;
    const barW = Math.round(60 * (val / (maxArtistVal || 1)));
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" class="artist-link">${d.artist}</a> <span>${d.totalHours.toFixed(2)}h / ${d.plays}p</span> <span class="spark-bar" style="display:inline-block;vertical-align:middle;width:64px;height:7px;background:#23272e;margin-left:8px;"><span style="display:inline-block;height:7px;width:${barW}px;background:#8b949e;opacity:0.25;"></span></span>`;
    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      showArtistDetails(d.artist, year);
    });
    topArtistsList.appendChild(li);
  });

  // 3. Top Albums
  let albumAgg = Data.computeAlbumAggregation(yearRecords, null, year)
    .filter(d => d.hours >= 0.25);
  if (sortKey === 'plays') {
    albumAgg = albumAgg.sort((a, b) => b.plays - a.plays);
  } else {
    albumAgg = albumAgg.sort((a, b) => b.hours - a.hours);
  }
  albumAgg = albumAgg.slice(0, 25);
  const topAlbumsList = document.getElementById('topAlbumsList');
  const maxAlbumVal = sortKey === 'plays' ? Math.max(...albumAgg.map(a => a.plays)) : Math.max(...albumAgg.map(a => a.hours));
  albumAgg.forEach(d => {
    const val = sortKey === 'plays' ? d.plays : d.hours;
    const barW = Math.round(60 * (val / (maxAlbumVal || 1)));
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" class="album-link">${d.album}</a> <span class="album-artist" style="color:#8b949e; font-size:0.92em; margin-left:6px;">${d.artist ? '(' + d.artist + ')' : ''}</span> <span>${d.hours.toFixed(2)}h / ${d.plays}p</span> <span class="spark-bar" style="display:inline-block;vertical-align:middle;width:64px;height:7px;background:#23272e;margin-left:8px;"><span style="display:inline-block;height:7px;width:${barW}px;background:#8b949e;opacity:0.25;"></span></span>`;
    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      showAlbumDetails(d.album, year);
    });
    topAlbumsList.appendChild(li);
  });

  // 4. Top Songs
  const songMap = new Map();
  yearRecords.forEach(r => {
    const key = r.master_metadata_track_name || 'Unknown Song';
    if (!songMap.has(key)) songMap.set(key, { name: key, count: 0, ms: 0, uri: r.spotify_track_uri, artist: r.master_metadata_album_artist_name });
    const entry = songMap.get(key);
    entry.count++;
    entry.ms += r.ms_played || 0;
  });
  let topSongs = Array.from(songMap.values())
    .filter(d => d.ms / 3600000 >= 0.1 || d.count >= 3);
  if (sortKey === 'plays') {
    topSongs = topSongs.sort((a, b) => b.count - a.count);
  } else {
    topSongs = topSongs.sort((a, b) => b.ms - a.ms);
  }
  topSongs = topSongs.slice(0, 25);
  const maxSongVal = sortKey === 'plays' ? Math.max(...topSongs.map(a => a.count)) : Math.max(...topSongs.map(a => a.ms));
  // --- Add event listener for deep dive sort toggle ---
  if (els.deepDiveSort) {
    els.deepDiveSort.addEventListener('change', () => {
      if (state.view === 'yearDeepDive') renderYearDeepDive();
    });
  }
  const topSongsList = document.getElementById('topSongsList');
  topSongs.forEach(d => {
    const val = sortKey === 'plays' ? d.count : d.ms;
    const barW = Math.round(60 * (val / (maxSongVal || 1)));
    const li = document.createElement('li');
    li.innerHTML = `<a href="#" class="song-link" data-uri="${d.uri}">${d.name}</a> <span class="song-artist" style="color:#8b949e; font-size:0.92em; margin-left:6px;">${d.artist ? '(' + d.artist + ')' : ''}</span> <span>${(d.ms/3600000).toFixed(2)}h / ${d.count}p</span> <span class="spark-bar" style="display:inline-block;vertical-align:middle;width:64px;height:7px;background:#23272e;margin-left:8px;"><span style="display:inline-block;height:7px;width:${barW}px;background:#8b949e;opacity:0.25;"></span></span>`;
    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      showSongDetails(d, year);
    });
    topSongsList.appendChild(li);
  });
}

function renderArtistDeepDive() {
  const artist = els.artistSearch.value.trim();
  if (!artist) {
    els.timelineContainer.innerHTML = '<p style="padding:10px">Enter an artist name above.</p>';
    return;
  }

  // Filter for exactly this artist (fuzzy match logic from original)
  let recs = state.allRecords.filter(r => (r.master_metadata_album_artist_name||'').toLowerCase() === artist.toLowerCase());
  if (recs.length === 0) {
    // try contains
    recs = state.allRecords.filter(r => (r.master_metadata_album_artist_name||'').toLowerCase().includes(artist.toLowerCase()));
  }

  // Expose a function for updating the side-panel with week details
  window.updateArtistWeekDetails = function(weekData) {
    // weekData: { date, hours, records: [track records] }
    // Aggregate tracks for this week
    const tracks = weekData.records.reduce((acc, r) => {
      const key = r.master_metadata_track_name || 'Unknown Track';
      if (!acc[key]) acc[key] = { name: key, count: 0, uri: r.spotify_track_uri };
      acc[key].count++;
      return acc;
    }, {});
    const trackList = Object.values(tracks)
      .sort((a,b) => b.count - a.count)
      .map(t => `<li><a href="#" class="trackLink" data-uri="${t.uri}">${t.name}</a> (${t.count})</li>`)
      .join('');
    let html = `<h3>${artist} — Week of ${weekData.date.toLocaleDateString()}</h3>`;
    html += `<h4>Tracks Played</h4><ol>${trackList}</ol>`;
    html += `<div id="playerContainer" style="margin-top:15px"></div>`;
    els.artistInfo.innerHTML = html;
  };

  Charts.renderTimeline('#artistTimelineContainer', recs, artist);
  // Add cumulative hours chart container below timeline
  const timelineContainer = document.getElementById('artistTimelineContainer');
  let cumuChart = document.getElementById('artistCumulativeChart');
  if (!cumuChart) {
    cumuChart = document.createElement('div');
    cumuChart.id = 'artistCumulativeChart';
    cumuChart.style.marginTop = '32px';
    timelineContainer.appendChild(cumuChart);
  } else {
    cumuChart.innerHTML = '';
  }
  Charts.renderArtistAlbumCumulative('#artistCumulativeChart', recs, artist);
  showArtistDetails(recs[0]?.master_metadata_album_artist_name || artist, null);
}

// --- Side Panel Details ---

function showArtistDetails(artistName, year) {
  const filtered = state.allRecords.filter(r => r.master_metadata_album_artist_name === artistName);
  
  // Get Album Data
  const albums = Data.computeAlbumAggregation(state.allRecords, artistName, year);
  // Get Top Tracks
  const topTracks = Data.getTopTracks(state.allRecords, artistName, year);

  // Build HTML
  let html = `<h3>${artistName} ${year ? `(${year})` : ''}</h3>`;
  
  // Pie Chart Container
  html += `<div id="albumPie" style="margin: 10px auto;"></div>`;
  
  // Tracks List
  html += `<h4>Top Tracks</h4><ol>`;
  topTracks.forEach(t => {
    html += `<li><a href="#" class="trackLink" data-uri="${t.uri}">${t.name}</a> (${t.count})</li>`;
  });
  html += `</ol>`;

  // Player Container
  html += `<div id="playerContainer" style="margin-top:15px"></div>`;
  
  // Heatmap Container (only if year is selected)
  if (year) {
    html += `<h4>Daily Heatmap (${year})</h4><div id="heatmapContainer"></div>`;
  }

  els.artistInfo.innerHTML = html;

  // Render Charts into side panel
  Charts.renderAlbumPie('#albumPie', albums);
  if (year) {
    Charts.renderHeatmap('#heatmapContainer', filtered, year);
  }
}

function playTrack(uri) {
  if (!uri) return;
  const id = uri.split(':').pop();
  els.stickyPlayer.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
}

// Start
init();

window.updateArtistSidePanel = function(album, albumRecords, artistName) {
  if (!album) {
    // Standard artist view: show top tracks
    const filtered = state.allRecords.filter(r => r.master_metadata_album_artist_name === artistName);
    const topTracks = Data.getTopTracks(state.allRecords, artistName, null);
    let html = `<h3>${artistName}</h3>`;
    html += `<h4>Top Tracks</h4><ol>`;
    topTracks.forEach(t => {
      html += `<li><a href="#" class="trackLink" data-uri="${t.uri}">${t.name}</a> (${t.count})</li>`;
    });
    html += `</ol>`;
    html += `<div id="playerContainer" style="margin-top:15px"></div>`;
    els.artistInfo.innerHTML = html;
    return;
  }
  // Album selected: show tracks for this album
  const trackMap = new Map();
  albumRecords.forEach(r => {
    const key = r.master_metadata_track_name || 'Unknown Song';
    if (!trackMap.has(key)) trackMap.set(key, { name: key, ms: 0, count: 0, uri: r.spotify_track_uri });
    const entry = trackMap.get(key);
    entry.ms += r.ms_played || 0;
    entry.count++;
  });
  const tracks = Array.from(trackMap.values()).sort((a, b) => b.ms - a.ms);
  let html = `<h3>${album} — Tracks</h3>`;
  html += `<ul class="album-song-list" style="margin-bottom:10px;">`;
  tracks.forEach(track => {
    html += `<li><a href="#" class="album-song-link" data-uri="${track.uri}">${track.name}</a> <span style='color:#8b949e;font-size:0.92em;margin-left:6px;'>${(track.ms/3600000).toFixed(2)}h / ${track.count}p</span></li>`;
  });
  html += `</ul>`;
  els.artistInfo.innerHTML = html;
  // Song link click events
  els.artistInfo.querySelectorAll('.album-song-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const uri = link.getAttribute('data-uri');
      const name = link.textContent;
      showSongDetails({ name, uri, album }, null);
    });
  });
};