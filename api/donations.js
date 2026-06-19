// api/donations.js  —  Steps 2a + 2b: cached donation ledger (memory + Google Drive).
// Reuses the same Google service account as the waitlist, with the Drive scope.
//
// Env vars:
//   ETHERSCAN_API_KEY    — the key formerly hardcoded in App.js
//   DRIVE_CACHE_FILE_ID  — id of the donations-cache.json file shared with the service account
//   GOOGLE_PROJECT_ID, GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY,
//   GOOGLE_CLIENT_EMAIL, GOOGLE_CLIENT_ID   — already set for the waitlist

const { google } = require('googleapis');

const TARGET = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';
const COIN = 'coingecko:polygon-ecosystem-token';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const TTL_MS = 60_000;
const CO2_KG_PER_TREE = 10; // TODO: set your real figure (trees -> CO2)

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const RATE_LIMIT_DELAY = 250;

// ---- module-scope caches (shared across warm invocations of this instance) ----
let memory = { data: null, ts: 0 };
let refreshing = false;
const priceAtTime = new Map(); // immutable historical prices, keyed by unix timestamp

// ---------- Google Drive (durable, cross-instance cache) ----------
const driveAuth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const driveApi = google.drive({ version: 'v3', auth: driveAuth });

async function readDriveCache() {
  const fileId = process.env.DRIVE_CACHE_FILE_ID;
  if (!fileId) return null;
  try {
    const res = await driveApi.files.get({ fileId, alt: 'media' });
    const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    return parsed && parsed.data && parsed.ts ? parsed : null; // { data, ts }
  } catch (e) {
    console.error('Drive read failed:', e.message);
    return null;
  }
}

async function writeDriveCache(snapshot) {
  const fileId = process.env.DRIVE_CACHE_FILE_ID;
  if (!fileId) return;
  try {
    await driveApi.files.update({
      fileId,
      media: { mimeType: 'application/json', body: JSON.stringify(snapshot) },
    });
  } catch (e) {
    console.error('Drive write failed:', e.message);
  }
}

// ---------- Etherscan ----------
async function fetchEtherscanPaginated(extraParams) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `https://api.etherscan.io/v2/api?chainid=137&module=account&${extraParams}` +
      `&startblock=0&endblock=99999999&page=${page}&offset=${PAGE_SIZE}` +
      `&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    let pageResult = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await (await fetch(url)).json();
        if (data.status === '1' && Array.isArray(data.result)) { pageResult = data.result; break; }
        if (data.status === '0' && /No transactions found/i.test(data.message || '')) return all;
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (pageResult === null) break;
    all.push(...pageResult);
    if (pageResult.length < PAGE_SIZE) break;
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  return all;
}

function filterDonations(txs) {
  const t = TARGET.toLowerCase();
  return txs.filter(tx =>
    tx.to?.toLowerCase() === t &&
    tx.value && tx.value !== '0' &&
    tx.isError === '0' &&
    tx.from?.toLowerCase() !== t
  );
}

// ---------- DefiLlama pricing ----------
async function getHistoricalPolPrice(unixTs) {
  if (priceAtTime.has(unixTs)) return priceAtTime.get(unixTs);
  try {
    const res = await fetch(`https://coins.llama.fi/prices/historical/${unixTs}/${COIN}?searchWidth=4h`);
    const price = (await res.json())?.coins?.[COIN]?.price;
    if (price > 0) { priceAtTime.set(unixTs, price); return price; }
  } catch {}
  return 0;
}

async function fetchCurrentPolPrice() {
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/${COIN}`);
    const p = (await res.json())?.coins?.[COIN]?.price;
    if (p > 0) return p;
  } catch {}
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/POL-USD/spot');
    const p = parseFloat((await res.json())?.data?.amount);
    if (p > 0) return p;
  } catch {}
  return 0;
}

async function priceDonations(donations) {
  return Promise.all(donations.map(async (tx) => {
    const ts = Number(tx.timeStamp);
    const amountPOL = Number(BigInt(tx.value)) / 1e18;
    const price = await getHistoricalPolPrice(ts);
    const usdAtTime = amountPOL * price;
    return {
      hash: tx.hash,
      from: tx.from.toLowerCase(),
      date: new Date(ts * 1000).toISOString(),
      amountPOL,
      usdAtTime,
      trees: Math.floor(usdAtTime),
      link: `https://polygonscan.com/tx/${tx.hash}`,
    };
  }));
}

// ---------- payload ----------
function computePayload(rows, polPriceNow) {
  const totalPOL = rows.reduce((s, r) => s + r.amountPOL, 0);
  const totalUsd = rows.reduce((s, r) => s + r.usdAtTime, 0);
  const trees = Math.floor(totalUsd);
  const co2MetricTons = (trees * CO2_KG_PER_TREE) / 1000;

  const byDonor = new Map();
  for (const r of rows) byDonor.set(r.from, (byDonor.get(r.from) || 0) + r.amountPOL);
  const topDonors = [...byDonor.entries()]
    .map(([address, amountPOL]) => ({ address, amountPOL }))
    .sort((a, b) => b.amountPOL - a.amountPOL)
    .slice(0, 3);

  return {
    updatedAt: Date.now(),
    polPriceNow,
    totals: { count: rows.length, totalPOL, totalUsd, trees, co2MetricTons },
    topDonors,
    donations: rows,
  };
}

async function buildFresh() {
  const [txs, polPriceNow] = await Promise.all([
    fetchEtherscanPaginated(`action=txlist&address=${TARGET}`),
    fetchCurrentPolPrice(),
  ]);
  const rows = await priceDonations(filterDonations(txs));
  return computePayload(rows, polPriceNow);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const now = Date.now();

  // 1) fresh in memory -> serve immediately
  if (memory.data && now - memory.ts < TTL_MS) {
    return res.status(200).json({ ...memory.data, cached: true });
  }

  // 2) memory stale/cold -> try the shared Drive copy (another instance may have refreshed)
  const fromDrive = await readDriveCache();
  if (fromDrive && now - fromDrive.ts < TTL_MS) {
    memory = fromDrive;
    return res.status(200).json({ ...fromDrive.data, cached: true });
  }

  // 3) stale everywhere -> rebuild once (guarded), then persist to Drive
  if (!refreshing) {
    refreshing = true;
    try {
      const data = await buildFresh();
      memory = { data, ts: Date.now() };
      await writeDriveCache(memory);
    } catch (e) {
      console.error('donations build failed:', e);
    } finally {
      refreshing = false;
    }
  }

  // 4) return the best copy we have
  const best = memory.data || fromDrive?.data;
  if (best) {
    const ts = memory.data ? memory.ts : fromDrive.ts;
    return res.status(200).json({ ...best, cached: now - ts >= TTL_MS });
  }
  return res.status(502).json({ error: 'Failed to build donation ledger' });
};