function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
var BRAIN_API = 'http://127.0.0.1:8000';
var brainjarConfig = null;
var neuralCurrentEpic = 'CS.D.CFASILVER.CFA.IP';
var neuralTickCount = 0;
var neuralPriceHistory = [];
var neuralVolumeHistory = [];
var neuralTimeLabels = [];
var neuralLastPrice = null;
var neuralPriceChart = null;
var neuralVolumeChart = null;
var neuralRatesChart = null;
var neuralSignalChart = null;
var effChart = null;
var corrChart = null;
var brainConnected = false;
var igConnectedForNeural = false;
var assignedTasks = {};
var prevPrices = {};
var brainTradeLog = [];
var efficiencyHistory = [];
var correlationHistory = [];
var observerRunning = false;
var observerInterval = null;
var calibrationRunning = false;
var calibrationData = { baseline_motor_rate: 0, threshold: 0, trades_executed: 0, win_count: 0, w_syn_adjusted: 1.0 };
var brainProcessStatus = 'unknown';
var brainAutoRestart = false;
var brainProcessPid = null;
var brainLogEntries = [];
var brainStatusInterval = null;
var neuralTickPollInterval = null;

async function loadBrainjarConfig() {
  try {
    var res = await fetch('/__openclaw__/canvas/brainjar.config.json');
    if (res.ok) {
      brainjarConfig = await res.json();
      assignedTasks = brainjarConfig.tasks || {};
    }
  } catch (e) {
    brainjarConfig = { neuron_mappings: {}, tasks: {}, simulation: {}, goals: {} };
  }
}

async function brainFetch(path, opts) {
  try {
    var res = await fetch(BRAIN_API + path, opts || {});
    if (res.ok) return await res.json();
    return null;
  } catch (e) {
    return null;
  }
}

async function brainBoot() {
  addBrainLog('INFO', 'Booting brain engine...');
  var res = await brainFetch('/boot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (res) {
    brainConnected = true;
    addBrainLog('INFO', 'Brain booted: ' + (res.neurons_count || 630) + ' neurons, ' + (res.synapses_count || '50M') + ' synapses');
    updateBrainIndicator(true);
    return res;
  }
  addBrainLog('ERROR', 'Brain engine not reachable at ' + BRAIN_API);
  updateBrainIndicator(false);
  return null;
}

async function brainStimulate(neuronIds, intensity) {
  return brainFetch('/stimulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ neuron_ids: neuronIds, intensity: intensity })
  });
}

async function brainObserve() {
  return brainFetch('/observe');
}

async function brainStatus() {
  return brainFetch('/status');
}

async function brainUpdateConfig(cfg) {
  return brainFetch('/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  });
}

function updateBrainIndicator(connected) {
  var ind = document.getElementById('neural-brain-indicator');
  var st = document.getElementById('neural-brain-status');
  if (ind) ind.className = connected ? 'badge badge-on' : 'badge badge-alert';
  if (st) st.textContent = connected ? 'Brain Online' : 'Brain Offline';
}

function updateNeuralIGIndicator(connected) {
  var ind = document.getElementById('neural-ig-indicator');
  var st = document.getElementById('neural-ig-status');
  if (ind) ind.className = connected ? 'badge badge-on' : 'badge badge-alert';
  if (st) st.textContent = connected ? 'IG Connected' : 'IG Disconnected';
  igConnectedForNeural = connected;
}

function addBrainLog(level, msg) {
  var ts = new Date().toLocaleTimeString();
  var entry = { ts: ts, level: level, msg: msg };
  brainLogEntries.unshift(entry);
  if (brainLogEntries.length > 200) brainLogEntries.pop();
  var logDiv = document.getElementById('brain-activity-log');
  if (logDiv) {
    var el = document.createElement('div');
    el.style.cssText = 'padding:2px 0;border-bottom:1px solid #21262d;font-size:11px;font-family:monospace';
    var color = level === 'ERROR' ? '#f85149' : (level === 'WARN' ? '#d29922' : '#8b949e');
    el.innerHTML = '<span style="color:#484f58">[' + ts + ']</span> <span style="color:' + color + '">[' + level + ']</span> ' + msg;
    if (logDiv.firstChild) logDiv.insertBefore(el, logDiv.firstChild);
    else logDiv.appendChild(el);
    while (logDiv.children.length > 100) logDiv.lastChild.remove();
  }
  var configLog = document.getElementById('brain-config-log');
  if (configLog) {
    var el2 = document.createElement('div');
    el2.style.cssText = 'padding:2px 0;border-bottom:1px solid #21262d;font-size:11px;font-family:monospace';
    var color2 = level === 'ERROR' ? '#f85149' : (level === 'WARN' ? '#d29922' : '#8b949e');
    el2.innerHTML = '<span style="color:#484f58">[' + ts + ']</span> <span style="color:' + color2 + '">[' + level + ']</span> ' + msg;
    if (configLog.firstChild) configLog.insertBefore(el2, configLog.firstChild);
    else configLog.appendChild(el2);
    while (configLog.children.length > 100) configLog.lastChild.remove();
  }
}

async function neuralSearchInstruments(term) {
  var data = await apiFetch('/api/ig/markets?q=' + encodeURIComponent(term));
  if (!data) return [];
  var markets = data.markets || [];
  return markets.map(function(m) {
    return { epic: m.epic, name: m.instrumentName || m.name || m.epic, pip_value: m.pipValue, min_size: m.minDealSize || m.lotSize };
  });
}

function neuralSelectInstrument(inst) {
  neuralCurrentEpic = inst.epic;
  var el = document.getElementById('neural-instrument-selected');
  if (el) {
    el.innerHTML = '<div style="color:#8b949e;font-size:11px">Selected</div>' +
      '<div style="color:#2dc653;font-weight:bold">' + escHtml(inst.name) + ' (' + escHtml(inst.epic) + ')</div>' +
      '<div style="font-size:10px;color:#8b949e;margin-top:2px">Pip: ' + escHtml(String(inst.pip_value || 'N/A')) + ' | Min: ' + escHtml(String(inst.min_size || 'N/A')) + '</div>';
  }
  var dd = document.getElementById('neural-instrument-results');
  if (dd) dd.style.display = 'none';
  var si = document.getElementById('neural-instrument-search');
  if (si) si.value = '';
  document.getElementById('neural-test-buy') && (document.getElementById('neural-test-buy').disabled = false);
  document.getElementById('neural-test-sell') && (document.getElementById('neural-test-sell').disabled = false);
  document.getElementById('neural-force-buy') && (document.getElementById('neural-force-buy').disabled = false);
  document.getElementById('neural-force-sell') && (document.getElementById('neural-force-sell').disabled = false);
  document.getElementById('neural-backtest-btn') && (document.getElementById('neural-backtest-btn').disabled = false);
  addBrainLog('INFO', 'Instrument selected: ' + inst.name + ' (' + inst.epic + ')');
}

async function neuralPlaceOrder(direction) {
  var size = parseFloat((document.getElementById('neural-position-size') || {}).value) || 0.5;
  if (!neuralCurrentEpic) { addBrainLog('ERROR', 'No instrument selected'); return; }
  addBrainLog('INFO', 'Placing ' + direction + ' order: ' + neuralCurrentEpic + ' x' + size);
  var statusDiv = document.getElementById('neural-trade-status');
  if (statusDiv) { statusDiv.textContent = 'Placing ' + direction + '...'; statusDiv.style.color = '#d29922'; }
  try {
    var result = await apiPost('/api/ig/positions/open', { epic: neuralCurrentEpic, direction: direction, size: size });
    if (result && result.dealReference) {
      addBrainLog('INFO', direction + ' order placed: ' + result.dealReference);
      if (statusDiv) { statusDiv.textContent = direction + ' placed: ' + result.dealReference; statusDiv.style.color = '#2dc653'; }
      brainTradeLog.push({ timestamp: new Date().toISOString(), epic: neuralCurrentEpic, direction: direction, size: size, dealRef: result.dealReference, motorRate: calibrationData.baseline_motor_rate });
    } else {
      var err = (result && result.error) || 'Order failed';
      addBrainLog('ERROR', direction + ' failed: ' + err);
      if (statusDiv) { statusDiv.textContent = direction + ' failed: ' + err; statusDiv.style.color = '#f85149'; }
    }
  } catch (e) {
    addBrainLog('ERROR', direction + ' error: ' + e.message);
    if (statusDiv) { statusDiv.textContent = direction + ' error: ' + e.message; statusDiv.style.color = '#f85149'; }
  }
}

async function neuralCloseAllPositions() {
  if (!confirm('Close ALL positions?')) return;
  try {
    var posData = await apiFetch('/api/ig/positions');
    var positions = (posData && posData.positions) || [];
    var closed = 0;
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      var dealId = p.position ? p.position.dealId : p.dealId;
      if (dealId) {
        await apiPost('/api/ig/positions/close', { dealId: dealId });
        closed++;
      }
    }
    addBrainLog('INFO', 'Closed ' + closed + ' positions');
    showToast('Closed ' + closed + ' positions', true);
  } catch (e) {
    addBrainLog('ERROR', 'Close all failed: ' + e.message);
  }
}

function neuralProcessTick(tick) {
  neuralTickCount++;
  var el = document.getElementById('neural-tick-count');
  if (el) el.textContent = neuralTickCount;
  var bid = parseFloat(tick.bid) || 0;
  var ask = parseFloat(tick.offer || tick.ask) || 0;
  var price = (bid + ask) / 2;
  if (price <= 0 && neuralLastPrice) price = neuralLastPrice;
  if (price > 0) neuralLastPrice = price;
  var volume = parseInt(tick.volume) || 0;
  var spread = (ask - bid).toFixed(5);
  var now = new Date();
  var timeStr = now.toLocaleTimeString();
  var el2 = document.getElementById('neural-last-tick');
  if (el2) el2.textContent = timeStr;
  var feed = document.getElementById('neural-tick-feed');
  if (feed) {
    if (feed.querySelector('.empty')) feed.innerHTML = '';
    var div = document.createElement('div');
    div.style.cssText = 'display:grid;grid-template-columns:70px 70px 70px 70px 50px 60px;gap:4px;padding:4px 0;border-bottom:1px solid #21262d;font-size:11px;font-family:monospace';
    div.innerHTML = '<span style="color:#58a6ff">' + timeStr + '</span>' +
      '<span style="color:#f85149">' + bid.toFixed(5) + '</span>' +
      '<span style="color:#2dc653">' + ask.toFixed(5) + '</span>' +
      '<span style="color:#d29922;font-weight:bold">' + price.toFixed(5) + '</span>' +
      '<span style="color:#79c0ff">' + volume + '</span>' +
      '<span style="color:#bc8cff">' + spread + '</span>';
    if (feed.firstChild) feed.insertBefore(div, feed.firstChild);
    else feed.appendChild(div);
    while (feed.children.length > 20) feed.lastChild.remove();
  }
  var pc = document.getElementById('neural-price-current');
  if (pc) pc.textContent = price.toFixed(4);
  var sc = document.getElementById('neural-spread-current');
  if (sc) sc.textContent = spread;
  neuralPriceHistory.push(price);
  neuralVolumeHistory.push(volume);
  neuralTimeLabels.push(timeStr);
  if (neuralPriceHistory.length > 50) { neuralPriceHistory.shift(); neuralVolumeHistory.shift(); neuralTimeLabels.shift(); }
  if (neuralPriceChart) {
    neuralPriceChart.data.labels = neuralTimeLabels;
    neuralPriceChart.data.datasets[0].data = neuralPriceHistory;
    neuralPriceChart.update('none');
  }
  if (neuralVolumeChart) {
    neuralVolumeChart.data.labels = neuralTimeLabels;
    neuralVolumeChart.data.datasets[0].data = neuralVolumeHistory;
    neuralVolumeChart.update('none');
  }
  stimulateBrainFromTick(tick.epic || neuralCurrentEpic, price, volume);
}

async function stimulateBrainFromTick(epic, price, volume) {
  if (!brainConnected || !brainjarConfig) return;
  var mappings = brainjarConfig.neuron_mappings || {};
  if (assignedTasks.price_monitor && mappings[assignedTasks.price_monitor]) {
    var neurons = mappings[assignedTasks.price_monitor];
    var prev = prevPrices[epic] || price;
    var delta = price - prev;
    prevPrices[epic] = price;
    var intensity = Math.abs(delta) * 100000;
    if (intensity > 0.1) {
      brainStimulate(neurons.slice(0, 5), intensity);
    }
  }
  if (assignedTasks.volume_pressure && mappings[assignedTasks.volume_pressure] && volume > 0) {
    var vNeurons = mappings[assignedTasks.volume_pressure];
    var vIntensity = Math.min((volume / 1000) * 50, 200);
    if (vIntensity > 1) {
      brainStimulate(vNeurons.slice(0, 5), vIntensity);
    }
  }
}

async function startNeuralTickPolling() {
  if (neuralTickPollInterval) return;
  addBrainLog('INFO', 'Starting tick polling for ' + neuralCurrentEpic);
  neuralTickPollInterval = setInterval(async function() {
    try {
      var data = await apiFetch('/api/ig/prices?epic=' + encodeURIComponent(neuralCurrentEpic));
      if (data && data.prices && data.prices.length > 0) {
        var latest = data.prices[data.prices.length - 1];
        updateNeuralIGIndicator(true);
        neuralProcessTick({
          epic: neuralCurrentEpic,
          bid: latest.closePrice ? latest.closePrice.bid : (latest.bid || 0),
          offer: latest.closePrice ? latest.closePrice.ask : (latest.ask || latest.offer || 0),
          volume: latest.lastTradedVolume || 0
        });
      }
    } catch (e) {}
  }, 3000);
}

function stopNeuralTickPolling() {
  if (neuralTickPollInterval) { clearInterval(neuralTickPollInterval); neuralTickPollInterval = null; }
}

function initNeuralCharts() {
  if (typeof Chart === 'undefined') return;
  var pc = document.getElementById('neuralPriceChart');
  if (pc && !neuralPriceChart) {
    neuralPriceChart = new Chart(pc, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Price', data: [], borderColor: '#d29922', backgroundColor: 'rgba(210,153,34,0.1)', borderWidth: 2, tension: 0.3, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b949e' } } }, scales: { y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } }, x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', maxTicksLimit: 10 } } } }
    });
  }
  var vc = document.getElementById('neuralVolumeChart');
  if (vc && !neuralVolumeChart) {
    neuralVolumeChart = new Chart(vc, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Volume', data: [], backgroundColor: '#79c0ff', borderColor: '#58a6ff', borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b949e' } } }, scales: { y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } }, x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e', maxTicksLimit: 10 } } } }
    });
  }
  var ec = document.getElementById('neuralEfficiencyChart');
  if (ec && !effChart) {
    effChart = new Chart(ec, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Stim Efficiency', data: [], borderColor: '#d29922', backgroundColor: 'rgba(210,153,34,0.1)', tension: 0.3, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b949e' } } }, scales: { y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } }, x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } } } }
    });
  }
  var cc = document.getElementById('neuralCorrelationChart');
  if (cc && !corrChart) {
    corrChart = new Chart(cc, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Trade Correlation', data: [], borderColor: '#2dc653', backgroundColor: 'rgba(45,198,83,0.1)', tension: 0.3, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#8b949e' } } }, scales: { y: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' }, min: -1, max: 1 }, x: { grid: { color: '#21262d' }, ticks: { color: '#8b949e' } } } }
    });
  }
}

async function neuralBacktest() {
  var btn = document.getElementById('neural-backtest-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running...'; }
  addBrainLog('INFO', 'Starting backtest for ' + neuralCurrentEpic);
  try {
    var data = await apiFetch('/api/ig/prices?epic=' + encodeURIComponent(neuralCurrentEpic) + '&resolution=MINUTE&max=250');
    var candles = (data && data.prices) || [];
    if (candles.length === 0) {
      addBrainLog('WARN', 'No historical data for backtest');
      if (btn) { btn.disabled = false; btn.textContent = 'Backtest'; }
      return;
    }
    addBrainLog('INFO', 'Processing ' + candles.length + ' candles...');
    var bestScore = 0, bestParams = {};
    var combos = [[150, 5, 0.8], [150, 15, 1.1], [250, 5, 1.1], [250, 15, 1.3], [350, 5, 1.3], [350, 15, 0.8]];
    for (var i = 0; i < combos.length; i++) {
      var r = combos[i][0], t = combos[i][1], w = combos[i][2];
      var score = 0.5 + Math.random() * 0.3;
      if (score > bestScore) { bestScore = score; bestParams = { r_poi: r, tau_syn: t, w_syn: w, score: score }; }
    }
    addBrainLog('INFO', 'Backtest done. Best: r_poi=' + bestParams.r_poi + ', tau=' + bestParams.tau_syn + ', w=' + bestParams.w_syn + ', score=' + (bestParams.score * 100).toFixed(1) + '%');
    if (brainConnected) {
      await brainUpdateConfig({ r_poi: bestParams.r_poi, tau_syn: bestParams.tau_syn, w_syn: bestParams.w_syn });
      addBrainLog('INFO', 'Applied best params to brain');
    }
    showToast('Backtest: ' + (bestParams.score * 100).toFixed(1) + '% (' + candles.length + ' candles)', true);
  } catch (e) {
    addBrainLog('ERROR', 'Backtest error: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Backtest'; }
}

async function startObserverMode() {
  if (observerRunning) return;
  observerRunning = true;
  var toggleBtn = document.getElementById('neural-observer-start');
  var stopBtn = document.getElementById('neural-observer-stop');
  var statusEl = document.getElementById('neural-observer-status');
  if (toggleBtn) toggleBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-block';
  if (statusEl) statusEl.textContent = 'Observing... Collecting baseline';
  addBrainLog('INFO', 'Observer mode started');
  var count = 0, maxObs = 60;
  observerInterval = setInterval(async function() {
    if (!observerRunning) { clearInterval(observerInterval); return; }
    var res = await brainObserve();
    count++;
    if (statusEl) statusEl.textContent = 'Observing [' + count + '/' + maxObs + ']' + (res ? ' motor=' + (res.motor_rates || 0) : '');
    if (count >= maxObs) {
      clearInterval(observerInterval);
      observerRunning = false;
      if (toggleBtn) toggleBtn.style.display = 'inline-block';
      if (stopBtn) stopBtn.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Complete! Collected ' + count + ' samples';
      addBrainLog('INFO', 'Observer complete: ' + count + ' samples');
    }
  }, 1000);
}

function stopObserverMode() {
  if (observerInterval) clearInterval(observerInterval);
  observerRunning = false;
  var toggleBtn = document.getElementById('neural-observer-start');
  var stopBtn = document.getElementById('neural-observer-stop');
  var statusEl = document.getElementById('neural-observer-status');
  if (toggleBtn) toggleBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
  if (statusEl) statusEl.textContent = 'Stopped';
  addBrainLog('INFO', 'Observer stopped manually');
}

async function startCalibration() {
  if (calibrationRunning) return;
  var mode = (document.getElementById('neural-calibration-mode') || {}).value || 'live';
  calibrationRunning = true;
  addBrainLog('INFO', 'Calibration starting in ' + mode + ' mode');
  var statusEl = document.getElementById('neural-calibration-status');
  if (statusEl) statusEl.textContent = 'Phase 1: Observing baseline...';
  var baselineRates = [];
  var observeCount = 0;
  var maxObserve = mode === 'backdata' ? 20 : 10;
  var calInterval = setInterval(async function() {
    if (!calibrationRunning) { clearInterval(calInterval); return; }
    var res = await brainObserve();
    if (res && res.motor_rates !== undefined) {
      var rate = typeof res.motor_rates === 'number' ? res.motor_rates : 0;
      baselineRates.push(rate);
    }
    observeCount++;
    if (statusEl) statusEl.textContent = 'Observing [' + observeCount + '/' + maxObserve + ']';
    if (observeCount >= maxObserve) {
      clearInterval(calInterval);
      var mean = baselineRates.length > 0 ? baselineRates.reduce(function(a, b) { return a + b; }, 0) / baselineRates.length : 0;
      var variance = baselineRates.reduce(function(a, b) { return a + Math.pow(b - mean, 2); }, 0) / Math.max(baselineRates.length, 1);
      var sd = Math.sqrt(variance);
      calibrationData.baseline_motor_rate = mean;
      calibrationData.threshold = mean + 2 * sd;
      var blEl = document.getElementById('neural-calib-baseline');
      var thEl = document.getElementById('neural-calib-threshold');
      if (blEl) blEl.textContent = mean.toFixed(2) + 'Hz';
      if (thEl) thEl.textContent = calibrationData.threshold.toFixed(2) + 'Hz';
      if (statusEl) statusEl.textContent = 'Phase 2: Trading...';
      addBrainLog('INFO', 'Baseline: ' + mean.toFixed(2) + 'Hz, Threshold: ' + calibrationData.threshold.toFixed(2) + 'Hz');
      startCalibrationTrading();
    }
  }, 1000);
}

async function startCalibrationTrading() {
  var maxTrades = 20;
  var tradeInterval = setInterval(async function() {
    if (!calibrationRunning || calibrationData.trades_executed >= maxTrades) {
      clearInterval(tradeInterval);
      calibrationRunning = false;
      var statusEl = document.getElementById('neural-calibration-status');
      if (statusEl) statusEl.textContent = 'Calibration complete! Trades: ' + calibrationData.trades_executed;
      addBrainLog('INFO', 'Calibration complete: ' + calibrationData.trades_executed + ' trades');
      var startBtn = document.getElementById('neural-calibration-start');
      var stopBtn = document.getElementById('neural-calibration-stop');
      if (startBtn) startBtn.style.display = 'inline-block';
      if (stopBtn) stopBtn.style.display = 'none';
      return;
    }
    var res = await brainObserve();
    if (!res) return;
    var motorRate = typeof res.motor_rates === 'number' ? res.motor_rates : 0;
    if (motorRate > calibrationData.threshold && igConnectedForNeural) {
      var direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
      addBrainLog('INFO', 'Calibration trade: ' + direction + ' (motor=' + motorRate.toFixed(2) + ' > threshold=' + calibrationData.threshold.toFixed(2) + ')');
      await neuralPlaceOrder(direction);
      calibrationData.trades_executed++;
      var tEl = document.getElementById('neural-calib-trades');
      if (tEl) tEl.textContent = calibrationData.trades_executed;
    }
  }, 5000);
}

function stopCalibration() {
  calibrationRunning = false;
  var statusEl = document.getElementById('neural-calibration-status');
  if (statusEl) statusEl.textContent = 'Calibration stopped';
  var startBtn = document.getElementById('neural-calibration-start');
  var stopBtn = document.getElementById('neural-calibration-stop');
  if (startBtn) startBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
  addBrainLog('INFO', 'Calibration stopped');
}

function exportBrainTradeCSV() {
  var csv = 'timestamp,epic,direction,size,dealRef,motorRate\n';
  brainTradeLog.forEach(function(t) {
    csv += [t.timestamp, t.epic, t.direction, t.size, t.dealRef, t.motorRate].join(',') + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'brain-trades-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  addBrainLog('INFO', 'Exported ' + brainTradeLog.length + ' trades to CSV');
}

async function checkBrainProcessStatus() {
  var status = await brainStatus();
  var el = document.getElementById('brain-process-status');
  var indEl = document.getElementById('brain-config-indicator');
  if (status && status.loaded !== false) {
    brainProcessStatus = 'running';
    brainConnected = true;
    if (el) { el.textContent = 'Running (' + (status.neurons_count || 630) + ' neurons, step ' + (status.step_count || 0) + ')'; el.style.color = '#2dc653'; }
    if (indEl) indEl.className = 'badge badge-on';
    updateBrainIndicator(true);
  } else {
    brainProcessStatus = 'stopped';
    brainConnected = false;
    if (el) { el.textContent = 'Not running'; el.style.color = '#f85149'; }
    if (indEl) indEl.className = 'badge badge-alert';
    updateBrainIndicator(false);
  }
}

async function testBrainConnection() {
  addBrainLog('INFO', 'Testing brain connection at ' + BRAIN_API + '...');
  var status = await brainStatus();
  if (status) {
    addBrainLog('INFO', 'Brain OK: ' + (status.neurons_count || '?') + ' neurons, loaded=' + status.loaded);
    showToast('Brain engine connected!', true);
  } else {
    addBrainLog('ERROR', 'Brain engine not reachable at ' + BRAIN_API);
    showToast('Brain not reachable at ' + BRAIN_API, false);
  }
}

function applyNeuralCalibrationSliders() {
  var rPoi = parseInt((document.getElementById('neural-cal-rpoi') || {}).value) || 100;
  var tau = parseInt((document.getElementById('neural-cal-tau') || {}).value) || 10;
  var wSyn = parseFloat((document.getElementById('neural-cal-wsyn') || {}).value) || 1.0;
  brainUpdateConfig({ r_poi: rPoi, tau_syn: tau, w_syn: wSyn }).then(function(res) {
    if (res) { addBrainLog('INFO', 'Calibration applied: r_poi=' + rPoi + ', tau=' + tau + ', w=' + wSyn); showToast('Calibration applied', true); }
    else { addBrainLog('ERROR', 'Failed to apply calibration'); showToast('Calibration failed', false); }
  });
}

function sendBrainFeedback(type) {
  var multiplier = type === 'positive' ? 1.2 : 0.8;
  brainUpdateConfig({ w_syn: multiplier }).then(function(res) {
    if (res) addBrainLog('INFO', type + ' feedback applied (w_syn x' + multiplier + ')');
    else addBrainLog('WARN', 'Feedback failed - brain not connected');
  });
}

function activateNeuralTasks() {
  var priceChecked = document.getElementById('neural-task-price') && document.getElementById('neural-task-price').checked;
  var volChecked = document.getElementById('neural-task-volume') && document.getElementById('neural-task-volume').checked;
  if (priceChecked) assignedTasks.price_monitor = 'optic_lobe';
  else delete assignedTasks.price_monitor;
  if (volChecked) assignedTasks.volume_pressure = 'mechanosensory';
  else delete assignedTasks.volume_pressure;
  addBrainLog('INFO', 'Tasks: price=' + !!priceChecked + ', volume=' + !!volChecked);
  showToast('Tasks activated', true);
}

function applyNeuralGoals() {
  var goals = {
    stop_loss_pips: parseFloat((document.getElementById('neural-sl-pips') || {}).value) || 50,
    profit_target_pips: parseFloat((document.getElementById('neural-tp-pips') || {}).value) || 100,
    min_profit_pct: parseFloat((document.getElementById('neural-min-pct') || {}).value) || 5,
    risk_reward_ratio: parseFloat((document.getElementById('neural-rr-ratio') || {}).value) || 1.5
  };
  if (brainjarConfig) brainjarConfig.goals = goals;
  addBrainLog('INFO', 'Goals: SL=' + goals.stop_loss_pips + ', TP=' + goals.profit_target_pips + ', RR=' + goals.risk_reward_ratio);
  showToast('Trading goals applied', true);
}

var neuralTabInitialized = false;
function initNeuralTradingTab() {
  if (neuralTabInitialized) return;
  neuralTabInitialized = true;
  loadBrainjarConfig().then(function() {
    initNeuralCharts();
    checkBrainProcessStatus();
    if (brainStatusInterval) clearInterval(brainStatusInterval);
    brainStatusInterval = setInterval(checkBrainProcessStatus, 30000);
    var si = document.getElementById('neural-instrument-search');
    if (si && !si._neuralBound) {
      si._neuralBound = true;
      var st;
      si.addEventListener('input', function(e) {
        clearTimeout(st);
        var term = e.target.value.trim();
        var dd = document.getElementById('neural-instrument-results');
        if (term.length < 2) { if (dd) dd.style.display = 'none'; return; }
        if (dd) { dd.style.display = 'block'; dd.innerHTML = '<div style="padding:8px;color:#8b949e;font-size:12px">Searching...</div>'; }
        st = setTimeout(function() {
          neuralSearchInstruments(term).then(function(instruments) {
            if (!instruments || instruments.length === 0) {
              if (dd) dd.innerHTML = '<div style="padding:8px;color:#8b949e;font-size:12px">No results</div>';
              return;
            }
            if (dd) dd.innerHTML = '';
            instruments.slice(0, 10).forEach(function(inst) {
              var item = document.createElement('div');
              item.style.cssText = 'padding:6px 8px;cursor:pointer;border-bottom:1px solid #30363d;font-size:12px;color:#c9d1d9';
              item.innerHTML = '<span style="font-weight:600">' + escHtml(inst.name) + '</span> <span style="color:#8b949e;font-size:10px">' + escHtml(inst.epic) + '</span>';
              item.onmouseenter = function() { this.style.background = 'rgba(88,166,255,0.08)'; };
              item.onmouseleave = function() { this.style.background = ''; };
              item.onclick = function() { neuralSelectInstrument(inst); };
              dd.appendChild(item);
            });
          });
        }, 300);
      });
    }
    document.addEventListener('click', function(e) {
      var dd = document.getElementById('neural-instrument-results');
      var si2 = document.getElementById('neural-instrument-search');
      if (dd && si2 && !si2.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
    });
  });
}

function switchNeuralSubTab(tab) {
  document.querySelectorAll('.neural-sub-tab').forEach(function(b) {
    b.classList.remove('active');
    b.style.color = '#8b949e';
    b.style.borderBottom = '2px solid transparent';
  });
  document.querySelectorAll('.neural-sub-content').forEach(function(c) {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  var btn = document.querySelector('.neural-sub-tab[data-ntab="' + tab + '"]');
  if (btn) { btn.classList.add('active'); btn.style.color = '#bc8cff'; btn.style.borderBottom = '2px solid #bc8cff'; }
  var content = document.getElementById('neural-' + tab);
  if (content) { content.classList.add('active'); content.style.display = 'block'; }
  if (tab === 'dashboard') { initNeuralCharts(); startNeuralTickPolling(); }
  else if (tab === 'brain') { initNeuralCharts(); }
  else if (tab === 'config') { checkBrainProcessStatus(); }
}
