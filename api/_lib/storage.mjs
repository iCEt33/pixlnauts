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
