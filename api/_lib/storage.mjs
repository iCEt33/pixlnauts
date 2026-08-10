// api/_lib/storage.js
// The ONLY place that knows whether we're on Pinata (testing) or Arweave (launch).
// Returns a FULL address: "ipfs://<CID>" or "ar://<TXID>".

export async function uploadToStorage(buffer, filename, mimeType) {
  const provider = process.env.STORAGE_PROVIDER; // "pinata" or "turbo"

  if (provider === "pinata") {
    // ---- TESTING PATH ----
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), filename);
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Pinata upload failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return `ipfs://${data.IpfsHash}`;
  }

  if (provider === "turbo") {
    // ---- LAUNCH PATH (pay-once permanent storage) ----
    const { TurboFactory } = await import("@ardrive/turbo-sdk");
    const { Readable } = await import("node:stream");

    const turbo = TurboFactory.authenticated({
      privateKey: JSON.parse(process.env.TURBO_JWK), // your funded Arweave wallet key
    });

    const result = await turbo.uploadFile({
      fileStreamFactory: () => Readable.from(buffer),
      fileSizeFactory: () => buffer.length,
      dataItemOpts: {
        tags: [{ name: "Content-Type", value: mimeType }], // so gateways serve GLB/PNG correctly
      },
    });
    return `ar://${result.id}`;
  }

  throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
}

// =========================================================
// v2.8 — SIGN NOW, UPLOAD LATER (Turbo only)
//
// An Arweave data item's id is the SHA-256 of its signature (ANS-104). So
// signing produces the address; uploading is a separate act. That lets the
// address go into the mint transaction BEFORE anything is stored, and a
// cancelled mint costs nothing.
//
// Pinata has no equivalent step, so the Pinata path keeps the old
// upload-then-mint order. Only the launch path changes.
// =========================================================

/** Sign a data item. Does NOT upload. Returns its permanent address + bytes. */
export async function signForLater(buffer, mimeType, tags = []) {
  if (process.env.STORAGE_PROVIDER !== "turbo") return null;   // Pinata: no-op

  const { TurboFactory } = await import("@ardrive/turbo-sdk");
  const { DataItem } = await import("@dha-team/arbundles");
  const { Readable } = await import("node:stream");

  const turbo = TurboFactory.authenticated({
    privateKey: JSON.parse(process.env.TURBO_JWK),
  });

  // turbo.signer is PUBLIC on TurboAuthenticatedClient (paymentService and
  // uploadService are protected; signer is not). Verified against 1.42.0.
  const signed = await turbo.signer.signDataItem({
    fileStreamFactory: () => Readable.from(buffer),
    fileSizeFactory: () => buffer.length,
    dataItemOpts: { tags: [{ name: "Content-Type", value: mimeType }, ...tags] },
  });

  // Collect the signed bytes so the id can be read and the exact same bytes
  // handed back later. Re-signing would NOT reproduce them: Arweave RSA-PSS
  // salts randomly, so the id would differ and the token would point at
  // something that never existed.
  const chunks = [];
  for await (const c of signed.dataItemStreamFactory()) chunks.push(c);
  const bytes = Buffer.concat(chunks);

  return { uri: `ar://${new DataItem(bytes).id}`, bytes };
}

/** Upload bytes that were already signed by signForLater(). */
export async function uploadSigned(bytes) {
  const { TurboFactory } = await import("@ardrive/turbo-sdk");
  const { DataItem } = await import("@dha-team/arbundles");
  const { Readable } = await import("node:stream");

  // Read the address off the bytes BEFORE spending anything. This is local
  // arithmetic -- sha256 of the signature -- not a network call, so doing it
  // first costs nothing and lets the caller reject bad bytes for free.
  const uri = `ar://${new DataItem(bytes).id}`;

  // uploadSignedDataItem is on the UNAUTHENTICATED interface: the signature
  // already carries the authorisation, so no key is needed here.
  const turbo = TurboFactory.unauthenticated();
  await turbo.uploadSignedDataItem({
    dataItemStreamFactory: () => Readable.from(bytes),
    dataItemSizeFactory: () => bytes.length,
  });
  return uri;
}
