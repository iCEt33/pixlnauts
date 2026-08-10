// js/chain-config.js — plan §6.1
// ONE place for every environment fact. Nothing else in the site holds an
// address, a chain, or an ABI. Flip the marked lines between testing and launch.

import { parseAbi, http, fallback } from "https://esm.sh/viem@2.37.5";
import { polygonAmoy, polygon } from "https://esm.sh/viem@2.37.5/chains";

// ===========================================================================
//  THE FOUR LINES YOU EDIT  (everything else in this file stays as-is)
// ===========================================================================

// 1. The contract's address. Printed by deploy.js in Phase 4.
//    Leave it as the zeros until then — the UI detects that and says
//    "not deployed yet" instead of throwing confusing errors.
export const CONTRACT_ADDRESS = "0x1b6d515ee015a8e850cbaab1bc9b039b273352fB";

// 2. Which chain. Amoy for the PROTOTYPE round, polygon at launch.
// const BASE_CHAIN = polygonAmoy;     // ← TESTING
const BASE_CHAIN = polygon;            // ← LAUNCH (swap the two comment marks)

// 3. The block the contract was deployed in. Also printed by deploy.js.
//    Only admin.html uses it (to know where to start scanning promo codes).
export const DEPLOY_BLOCK = 91792897n;

// 4. The RPC endpoint. NOT OPTIONAL ANY MORE.
//
//    Polygon shut down its own free public endpoints: Amoy on 17 July 2026 and
//    mainnet on 31 July 2026. They are gone, not slow.
//
//    viem still ships those two dead URLs as its built-in defaults, so leaving
//    this blank does two bad things at once: the site cannot read the chain,
//    AND when it offers to add the network to someone's wallet it would write
//    a dead endpoint into their MetaMask, permanently.
//
//    Verified answering on 2026-07-31: https://polygon-amoy.drpc.org
//    For mainnet you need a working endpoint here too — a free keyed one from
//    Alchemy / Infura / QuickNode, or Tenderly's public Polygon endpoint.
export const RPC_URL = "https://tenderly.rpc.polygon.community";

// 4b. Optional second endpoint. If the first stops answering, reads fall
//     through to this one on their own, and BOTH get offered to the wallet so
//     it has somewhere to go if one dies. Worth filling in before launch —
//     what happened in July is exactly what this protects against.
export const RPC_URL_BACKUP = "https://polygon.drpc.org";

// 5. Optional: an Alchemy API key, ONLY used to make "My Collection" load in
//    one request instead of one per robot. Leave it empty and the collection
//    still works — it just reads the chain directly, which is fine for the
//    first few hundred robots. This is a speed-up, never a dependency.
//    NOTE: a key written here is visible to anyone who views the page. Before
//    launch, restrict it to your own domains in the Alchemy dashboard.
export const ALCHEMY_KEY = "";

// 6. The gateway used to SHOW stored pictures and models. Same lesson as the
//    RPC above: this is a public shared service, and public shared services
//    get rate-limited or retired. ipfs.io works but throttles, and every
//    robot picture in My Collection loads through it.
//    Once you have a Pinata account you get a dedicated gateway that is yours:
//      https://YOUR-SUBDOMAIN.mypinata.cloud/ipfs/
//    Put it here and the collection stops depending on a shared queue.
//    MUST end with a slash.
export const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

// 7. Same again for Arweave, which is only used after the launch switch to
//    Turbo storage. arweave.net is the reference gateway.
export const ARWEAVE_GATEWAY = "https://arweave.net/";

// ===========================================================================
//  Below here: nothing to edit
// ===========================================================================

// The endpoints we actually trust, in order of preference.
const RPCS = [RPC_URL, RPC_URL_BACKUP]
  .map((u) => (typeof u === "string" ? u.trim() : ""))
  .filter(Boolean);

export const HAS_RPC = RPCS.length > 0;

if (!HAS_RPC) {
  console.warn(
    "[B-b0] No RPC_URL is set in js/chain-config.js. viem's built-in default " +
    "for this chain is one of Polygon's retired public endpoints, so nothing " +
    "will be able to read the chain. Fill in RPC_URL."
  );
}

// THE CHAIN, with our endpoints substituted for viem's built-in ones.
//
// This matters in two places, and the second is the one that bites people:
//   1. it is what the site reads through, and
//   2. it is what gets handed to the wallet by wallet_addEthereumChain when we
//      offer to add the network.
// Leaving viem's defaults in place would mean every visitor who does not
// already have this network ends up with a dead RPC saved in their wallet.
export const CHAIN = HAS_RPC
  ? {
      ...BASE_CHAIN,
      rpcUrls: {
        ...BASE_CHAIN.rpcUrls,
        default: { http: RPCS },
        public: { http: RPCS },
      },
    }
  : BASE_CHAIN;

// One transport for the whole site. With two endpoints configured, viem tries
// the second automatically when the first fails.
export const TRANSPORT = RPCS.length > 1
  ? fallback(RPCS.map((u) => http(u)))
  : http(RPCS[0] || undefined);

// Which Alchemy network slug matches the chain we are pointed at. Anything we
// do not recognise simply turns the accelerator off rather than guessing.
export const ALCHEMY_NETWORK =
  CHAIN.id === 137   ? "polygon-mainnet" :
  CHAIN.id === 80002 ? "polygon-amoy"    : null;

export const ALCHEMY_NFT_BASE =
  ALCHEMY_KEY && ALCHEMY_NETWORK
    ? `https://${ALCHEMY_NETWORK}.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`
    : null;

// Same-origin Vercel functions — the customizer and /api live on one domain.
export const API = "";

// True once a real address is in place. Used to show a friendly message
// instead of letting viem throw at people during Phase 3.
export const IS_DEPLOYED =
  /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS) &&
  CONTRACT_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000";

// Turn a stored address into a viewable link (works for both storage providers)
export function toViewableURL(uri) {
  if (typeof uri !== "string") return "";
  const ipfs = IPFS_GATEWAY.endsWith("/") ? IPFS_GATEWAY : IPFS_GATEWAY + "/";
  const ar = ARWEAVE_GATEWAY.endsWith("/") ? ARWEAVE_GATEWAY : ARWEAVE_GATEWAY + "/";
  if (uri.startsWith("ipfs://")) return ipfs + uri.slice(7);
  if (uri.startsWith("ar://")) return ar + uri.slice(5);
  return uri;
}

// Explorer + marketplace links, derived from the chain so they can never
// disagree with which network you are pointed at.
export function txURL(hash) {
  return `${CHAIN.blockExplorers.default.url}/tx/${hash}`;
}
export function addressURL(addr) {
  return `${CHAIN.blockExplorers.default.url}/address/${addr}`;
}
export function openSeaURL(tokenId) {
  return CHAIN.id === polygon.id
    ? `https://opensea.io/assets/matic/${CONTRACT_ADDRESS}/${tokenId}`
    : `https://testnets.opensea.io/assets/amoy/${CONTRACT_ADDRESS}/${tokenId}`;
}

// The contract's public interface, human-readable form.
// Re-verified for v2.8 by computing every selector from these strings and
// comparing against the compiled artifact — not by reading them.
//
// v2.8 changes:
//   * mint / upgrade lose their model-address argument (one file per mint now)
//   * modelURI(uint256) becomes modelURIOverride(uint256) — normally "" —
//     because animation_url is BUILT from rendererURI + the config
//   * description() / tokenNote() / rendererURI() are readable
//   * setDescription / setTokenNote / setRendererURI are included because the
//     admin panel (UI-6) drives them. setPartInfo / repairAssets / setSigner /
//     setRoyalty are still omitted ON PURPOSE (§6.6 — Polygonscan only). When
//     the panel is built, that split needs revisiting: the spec expects it to
//     drive those too.
export const ABI = parseAbi([
  "function mint((uint8,uint8,uint8,uint8,uint8,uint8,uint8), string, uint256, bytes, string) payable returns (uint256)",
  "function upgrade(uint256, (uint8,uint8,uint8,uint8,uint8,uint8,uint8), string, uint256, bytes) payable",
  "function quoteMint((uint8,uint8,uint8,uint8,uint8,uint8,uint8), string, address) view returns (uint256, bool, uint256)",
  "function quoteUpgrade(uint256, (uint8,uint8,uint8,uint8,uint8,uint8,uint8)) view returns (uint256)",
  "function calculateConfigPrice((uint8,uint8,uint8,uint8,uint8,uint8,uint8)) view returns (uint256)",
  "function getConfig(uint256) view returns (uint8[7])",
  "function imageURI(uint256) view returns (string)",
  "function modelURIOverride(uint256) view returns (string)",
  "function rendererURI() view returns (string)",
  "function description() view returns (string)",
  "function signer() view returns (address)",
  "function collectionURI() view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenNote(uint256) view returns (string)",
  "function unlocked(uint256, uint8, uint8) view returns (bool)",
  "function checkPromoCode(string, address) view returns (bool, uint256, uint256, uint256)",
  "function currentTokenId() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function currentBatch() view returns (uint256)",
  "function availableInCurrentBatch() view returns (uint256)",
  "function isMintOpen() view returns (bool)",
  "function ownerOf(uint256) view returns (address)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function promoCodes(bytes32) view returns (uint256, uint256, uint256, uint256, bool)",
  "function createPromoCode(string, uint256, uint256, uint256)",
  "function deactivatePromoCode(string)",
  "function unlockNextBatch()",
  "function unlockMultipleBatches(uint256)",
  "function pause()",
  "function unpause()",
  "function withdraw()",
  "function setDescription(string)",
  "function setTokenNote(uint256, string)",
  "function setRendererURI(string)",
  "event PromoCodeCreated(string code, uint256 discountPercent, uint256 maxUsesPerWallet, uint256 maxUsesGlobal)",
  "event PromoCodeDeactivated(string code)",
  "event TokenMinted(uint256 indexed tokenId, address indexed owner, uint8[7] config, uint256 pricePaid)",
  "event TokenUpgraded(uint256 indexed tokenId, uint8[7] newConfig, uint256 pricePaid)",
  "event DescriptionUpdated()",
  "event TokenNoteUpdated(uint256 indexed tokenId)",
  "event RendererUpdated()",
]);
