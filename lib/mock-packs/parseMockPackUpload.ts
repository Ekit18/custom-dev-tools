import JSZip from "jszip";

export type ParsedUploadCsv = {
  productsCsv: string;
  collectionsCsv: string;
  customersCsv: string;
};

const REQUIRED = ["products.csv", "collections.csv", "customers.csv"] as const;

function assertFilesPresent(files: Map<string, string>) {
  for (const name of REQUIRED) {
    if (!files.has(name)) {
      throw new Error(
        `Missing ${name} in upload (zip must contain these at archive root)`,
      );
    }
  }
}

export async function parseMultipartMockPack(
  form: FormData,
): Promise<ParsedUploadCsv> {
  const archive = form.get("archive");
  if (archive instanceof File && archive.size > 0) {
    const buf = Buffer.from(await archive.arrayBuffer());
    return parseZipBuffer(buf);
  }

  const p = form.get("products");
  const c = form.get("collections");
  const u = form.get("customers");
  if (p instanceof File && c instanceof File && u instanceof File) {
    return {
      productsCsv: await p.text(),
      collectionsCsv: await c.text(),
      customersCsv: await u.text(),
    };
  }

  throw new Error(
    "Provide either a single archive zip (field: archive) with products.csv, collections.csv, customers.csv at root, or three files: products, collections, customers",
  );
}

export async function parseZipBuffer(buffer: Buffer): Promise<ParsedUploadCsv> {
  const zip = await JSZip.loadAsync(buffer);
  const map = new Map<string, string>();
  for (const name of REQUIRED) {
    const entry = zip.file(name);
    if (!entry) {
      const lower = zip.file(name.toLowerCase());
      if (!lower) continue;
      map.set(name, await lower.async("string"));
    } else {
      map.set(name, await entry.async("string"));
    }
  }
  assertFilesPresent(map);
  const p = map.get("products.csv");
  const c = map.get("collections.csv");
  const u = map.get("customers.csv");
  if (!p || !c || !u) {
    throw new Error("Zip entries could not be read");
  }
  return {
    productsCsv: p,
    collectionsCsv: c,
    customersCsv: u,
  };
}
