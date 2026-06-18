// api/donations.js  —  Step 2a: cached donation ledger (in-memory cache only).
// Drive persistence (Step 2b) bolts on later without changing this shape.
//
// Requires Node 18+ for global fetch (Vercel default). Set ETHERSCAN_API_KEY in
// your Vercel env (the value currently hardcoded in App.js).

const TARGET = '0xC3d6fA212211Ae1feE31054363130c69984698Ae';
const COIN = 'coingecko:polygon-ecosystem-token';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const TTL_MS = 60_000;
const CO2_KG_PER_TREE = 21; // TODO: set your real figure (trees -> CO2)

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const RATE_LIMIT_DELAY = 250;

// ---- module-scope caches (shared across warm invocations of this instance) ----
let memory = { data: null, ts: 0 };
let refreshing = false;
const priceAtTime = new Map(); // immutable historical prices, keyed by unix timestamp

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
    if (pageResult === null) break;            // page failed after retries -> return partial
    all.push(...pageResult);
    if (pageResult.length < PAGE_SIZE) break;  // short page -> last page
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
  if (priceAtTime.has(unixTs)) return priceAtTime.get(unixTs); // cache hit, no network
  try {
    const res = await fetch(`https://coins.llama.fi/prices/historical/${unixTs}/${COIN}?searchWidth=4h`);
    const price = (await res.json())?.coins?.[COIN]?.price;
    if (price > 0) { priceAtTime.set(unixTs, price); return price; } // cache only on success
  } catch {}
  return 0; // failure not cached -> retries next pass
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

// ---------- shape the payload the client consumes ----------
function computePayload(rows, polPriceNow) {
  const totalPOL = rows.reduce((s, r) => s + r.amountPOL, 0);
  const totalUsd = rows.reduce((s, r) => s + r.usdAtTime, 0);
  const trees = Math.floor(totalUsd);                 // floor the sum, not per-row
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
    donations: rows, // full priced list; client filters by `from` for per-user history
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

  // 1) fresh enough in memory -> serve immediately
  if (memory.data && now - memory.ts < TTL_MS) {
    return res.status(200).json({ ...memory.data, cached: true });
  }

  // 2) stale -> rebuild once (guard prevents this instance double-building)
  if (!refreshing) {
    refreshing = true;
    try {
      memory = { data: await buildFresh(), ts: Date.now() };
    } catch (e) {
      console.error('donations build failed:', e);
    } finally {
      refreshing = false;
    }
  }

  // 3) return whatever we have (fresh, or last-good if a rebuild was in flight / failed)
  if (memory.data) {
    return res.status(200).json({ ...memory.data, cached: Date.now() - memory.ts >= TTL_MS });
  }
  return res.status(502).json({ error: 'Failed to build donation ledger' });
};
