// js/wallet.js - plan section 6.2, extended with EIP-6963 wallet discovery.
//
// WHY THIS IS MORE THAN "window.ethereum":
// Every wallet extension writes itself into the single window.ethereum slot,
// so whichever loads last wins and the others become invisible. That is why
// clicking Connect can hand you Coinbase when you wanted MetaMask.
// EIP-6963 fixes it: we ask "who is there?" and every installed wallet
// answers with its own name, icon and provider. The person then picks.
//
// TWO DELIBERATE NON-FEATURES:
//  1. We never remember the last wallet. Silently reconnecting whatever was
//     used before is the same problem this file exists to solve, wearing a
//     different hat. Minting is rare enough to choose on purpose every time.
//  2. Connecting never triggers a network switch. A second popup nobody asked
//     for is confusing. The panel warns instead, and the mint switches at the
//     moment it actually matters.
//
// This file holds NO user interface. mint-ui.js draws the picker.

import { createPublicClient, createWalletClient, custom } from "https://esm.sh/viem@2.37.5";
import { CONTRACT_ADDRESS, CHAIN, ABI, TRANSPORT, HAS_RPC } from "./chain-config.js";

// Reading the chain needs no wallet at all.
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: TRANSPORT,
});

export let walletClient = null;
export let account = null;
export let activeWallet = null;   // { rdns, name, icon } of the wallet in use
export let chainOk = false;       // is that wallet pointed at CHAIN right now?

let activeProvider = null;        // the raw EIP-1193 object we talk to

// --------------------------------------------------------------------------
// discovery
// --------------------------------------------------------------------------
const found = new Map(); // rdns -> { info, provider }

function onAnnounce(event) {
  const detail = event.detail;
  if (detail?.info?.rdns && detail.provider) found.set(detail.info.rdns, detail);
}

// Listen from the moment this file loads - wallets announce themselves on
// their own schedule, and some do it before anything asks.
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

// Older wallets that predate EIP-6963. Only used if nobody announced.
// Coinbase historically exposed window.ethereum.providers as an array.
function legacyWallets() {
  const eth = window.ethereum;
  if (!eth) return [];
  const list = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth];
  return list.map((provider, i) => {
    // Check Coinbase FIRST - it also sets isMetaMask on its provider.
    const name = provider.isCoinbaseWallet ? "Coinbase Wallet"
      : provider.isRabby       ? "Rabby"
      : provider.isBraveWallet ? "Brave Wallet"
      : provider.isTrust       ? "Trust Wallet"
      : provider.isMetaMask    ? "MetaMask"
      : "Browser wallet";
    return { info: { rdns: `legacy:${name}:${i}`, name, icon: null }, provider };
  });
}

/** Every wallet we can see, as [{ rdns, name, icon }]. Safe to call repeatedly. */
export async function listWallets(waitMs = 250) {
  if (typeof window === "undefined") return [];
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((r) => setTimeout(r, waitMs));
  const modern = [...found.values()];
  const all = modern.length ? modern : legacyWallets();
  return all.map((w) => ({ rdns: w.info.rdns, name: w.info.name, icon: w.info.icon }));
}

function providerFor(rdns) {
  return found.get(rdns) || legacyWallets().find((w) => w.info.rdns === rdns) || null;
}

// --------------------------------------------------------------------------
// connecting
// --------------------------------------------------------------------------
const listeners = new Set();
export function onWalletChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function announce() {
  for (const fn of listeners) {
    try { fn(account); } catch (e) { console.error(e); }
  }
}

function attach(provider, info) {
  activeProvider = provider;
  activeWallet = info ? { rdns: info.rdns, name: info.name, icon: info.icon } : null;
  walletClient = createWalletClient({ chain: CHAIN, transport: custom(provider), account });

  // React to changes made inside the wallet itself.
  provider.on?.("accountsChanged", (accts) => {
    account = accts?.[0] || null;
    walletClient = account
      ? createWalletClient({ chain: CHAIN, transport: custom(provider), account })
      : null;
    if (!account) { activeWallet = null; chainOk = false; }
    announce();
  });
  provider.on?.("chainChanged", (hex) => {
    chainOk = parseInt(hex, 16) === CHAIN.id;
    announce();
  });
}

/**
 * Connect to a wallet.
 *   rdns                - which wallet. Required when more than one exists.
 *   forceAccountPicker  - also reopen the wallet's own account chooser.
 * Throws CHOOSE_WALLET when several are installed and none was named; that is
 * mint-ui.js's cue to show the picker. It never picks for you.
 */
export async function connectWallet(rdns = null, { forceAccountPicker = false } = {}) {
  const wallets = await listWallets();
  if (wallets.length === 0) {
    throw new Error("No wallet found. Install MetaMask, then reload this page.");
  }

  let target = rdns;
  if (!target) {
    // Only skip the picker when there is genuinely nothing to pick.
    if (wallets.length === 1) target = wallets[0].rdns;
    else {
      const err = new Error("Choose a wallet");
      err.code = "CHOOSE_WALLET";
      throw err;
    }
  }

  const chosen = providerFor(target);
  if (!chosen) throw new Error("That wallet is no longer available.");

  // "Switch wallet" reopens the account chooser first, so one action covers
  // both picking a wallet AND picking an account inside it. Without this,
  // eth_requestAccounts silently returns the same account as before.
  if (forceAccountPicker) {
    try {
      await chosen.provider.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (e) {
      if (e?.code === 4001) { const c = new Error("Cancelled"); c.code = "CANCELLED"; throw c; }
      // wallet does not support it - carry on with a plain connect
    }
  }

  const [addr] = await chosen.provider.request({ method: "eth_requestAccounts" });
  if (!addr) throw new Error("No account was shared by the wallet.");

  account = addr;
  attach(chosen.provider, chosen.info);

  // Only LOOK at the network. No popup here.
  chainOk = (await getChainId()) === CHAIN.id;

  announce();
  return account;
}

/** What network is the wallet actually on right now? Read-only, no prompt. */
export async function getChainId() {
  if (!activeProvider) return null;
  try {
    return parseInt(await activeProvider.request({ method: "eth_chainId" }), 16);
  } catch { return null; }
}

/**
 * Actively move the wallet onto CHAIN. If it has never heard of the network
 * (error 4902 on a testnet) add it first, then switch again.
 * Called by the yellow warning's button, and by mint.js before spending.
 */
export async function ensureChain() {
  if (!walletClient) throw new Error("Connect a wallet first.");
  if ((await getChainId()) === CHAIN.id) { chainOk = true; announce(); return true; }

  try {
    await walletClient.switchChain({ id: CHAIN.id });
  } catch {
    try {
      // Only ever offer to ADD a network when we have an endpoint we know
      // answers. Adding one blind would save a dead RPC into the person's
      // wallet, and they would have to find and fix it by hand later.
      if (!HAS_RPC) {
        throw new Error("no verified RPC endpoint configured");
      }
      await walletClient.addChain({ chain: CHAIN });
      await walletClient.switchChain({ id: CHAIN.id });
    } catch {
      chainOk = false;
      announce();
      throw new Error(
        `This wallet would not switch to ${CHAIN.name}. Add it by hand in the ` +
        `wallet's own network settings, or use a different wallet.`
      );
    }
  }

  chainOk = (await getChainId()) === CHAIN.id;
  announce();
  return chainOk;
}

/**
 * Forget the wallet on this page, and ASK it to revoke us.
 * Honest note: a website cannot force a wallet to disconnect. MetaMask added
 * wallet_revokePermissions, but most wallets still ignore it - so this always
 * clears our side, and the revoke is a best effort that may do nothing.
 */
export async function forgetWallet() {
  const provider = activeProvider;
  account = null;
  walletClient = null;
  activeProvider = null;
  activeWallet = null;
  chainOk = false;
  try {
    await provider?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
  } catch { /* wallet does not support it - expected */ }
  announce();
}

// Every read and write call spreads this: { ...contract, functionName, args }
export const contract = { address: CONTRACT_ADDRESS, abi: ABI };
