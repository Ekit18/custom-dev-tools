import { parse } from "csv-parse/sync";
import { getAccessToken } from "@/lib/access-token";
import { prisma } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { getMockPackPayload } from "@/lib/mock-packs/mongoPayload";
import { SHOPIFY_ADMIN_API_VERSION } from "@/lib/shopifyAdminVersion";
import type { CollectionRow, CustomerRow, ProductRow } from "./types";

const PRODUCT_SET = `#graphql
mutation productSet($input: ProductSetInput!) {
  productSet(input: $input) {
    product { id title }
    userErrors { field message }
  }
}`;

const COLLECTION_CREATE = `#graphql
mutation collectionCreate($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id title }
    userErrors { field message }
  }
}`;

const CUSTOMER_CREATE = `#graphql
mutation customerCreate($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id email }
    userErrors { field message }
  }
}`;

const LOCATIONS_QUERY = `#graphql
query { locations(first: 5) { edges { node { id isActive } } } }
`;

async function shopifyGraphQL(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
) {
  const url = `https://${shopDomain}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };
  if (!res.ok) {
    throw new Error(
      json.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`,
    );
  }
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function getLocationId(
  shopDomain: string,
  accessToken: string,
): Promise<string | undefined> {
  const data = (await shopifyGraphQL(
    shopDomain,
    accessToken,
    LOCATIONS_QUERY,
  )) as {
    locations?: {
      edges?: { node?: { id: string; isActive: boolean } }[];
    };
  };
  const edges = data?.locations?.edges ?? [];
  const active = edges.map((e) => e?.node).find((n) => n?.isActive);
  return active?.id ?? edges[0]?.node?.id;
}

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}

/** Same options as `validateMockPackCsv` so upload validation and generation agree. */
function parseCsv<T extends Record<string, string>>(csv: string): T[] {
  const text = stripBom(csv);
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as T[];
}

function buildProductInput(
  row: ProductRow,
  locationId: string | undefined,
  syntheticTag: string,
  index: number,
): Record<string, unknown> {
  const tagParts = (row.tags ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tagParts.includes(syntheticTag)) {
    tagParts.push(syntheticTag);
  }

  const imageUrls = [
    row.image_url_1,
    row.image_url_2,
    row.image_url_3,
    row.image_url_4,
    row.image_url_5,
  ].filter((u): u is string => typeof u === "string" && u.startsWith("http"));

  const priceRaw = row.price.replace(",", ".");
  const price = Number.parseFloat(priceRaw);
  const priceStr = Number.isFinite(price) ? price.toFixed(2) : "0.00";

  let qty = 0;
  if (row.inventory_qty) {
    const q = Number.parseInt(row.inventory_qty, 10);
    if (!Number.isNaN(q) && q >= 0) qty = q;
  }

  const skuUnique = `${row.sku}-mock-${index}`;
  const product: Record<string, unknown> = {
    title: row.title || "Untitled",
    handle: `${row.sku?.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "p"}-mock-${index}`,
    descriptionHtml: row.body_html ?? "",
    productType: row.product_type ?? "",
    tags: tagParts,
    vendor: row.vendor ?? "Mock data",
    status: "ACTIVE",
    productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
    variants: [
      {
        optionValues: [{ optionName: "Title", name: "Default Title" }],
        price: priceStr,
        sku: skuUnique,
        taxable: true,
        inventoryItem: { tracked: qty > 0 },
        inventoryQuantities:
          locationId && qty > 0
            ? [
                {
                  quantity: qty,
                  locationId,
                  name: "available",
                },
              ]
            : [],
      },
    ],
    files: imageUrls.map((originalSource) => ({
      contentType: "IMAGE",
      originalSource,
    })),
    seo: {
      title: (row.title || "Product").slice(0, 70),
      description: (row.body_html ?? "").replace(/<[^>]+>/g, "").slice(0, 160),
    },
  };

  return product;
}

export async function runMockGeneration(jobId: string): Promise<void> {
  const job = await prisma.mockGenerationJob.findUnique({
    where: { id: jobId },
    include: { pack: true, store: true },
  });
  if (!job) {
    throw new Error("Job not found");
  }

  await prisma.mockGenerationJob.update({
    where: { id: jobId },
    data: { status: "RUNNING" },
  });

  const store = job.store;
  const pack = job.pack;
  const requested = job.requestedProductCount;

  const payload = await getMockPackPayload(pack.id);
  if (!payload) {
    await prisma.mockGenerationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage:
          "Mock pack CSV payload not found in MongoDB for this pack id",
        completedAt: new Date(),
      },
    });
    return;
  }

  const decryptedClientSecret = decrypt(store.clientSecret);
  const { accessToken, expiresIn, fresh } = await getAccessToken(
    store.id,
    store.shopDomain,
    store.clientId,
    decryptedClientSecret,
  );
  if (fresh) {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        adminAccessToken: encrypt(accessToken),
        expireAt: new Date(Date.now() + expiresIn * 1000),
      },
    });
  }

  const productRows = parseCsv<ProductRow>(payload.productsCsv);
  const collectionRows = parseCsv<CollectionRow>(payload.collectionsCsv);
  const customerRows = parseCsv<CustomerRow>(payload.customersCsv);

  if (productRows.length === 0) {
    throw new Error("Pack has no product rows");
  }

  const syntheticTag = `mock-pack-${pack.slug}`;
  const locationId = await getLocationId(store.shopDomain, accessToken);

  const errs: string[] = [];

  for (let i = 0; i < requested; i++) {
    const template = productRows[i % productRows.length];
    const input = buildProductInput(template, locationId, syntheticTag, i);
    try {
      const data = (await shopifyGraphQL(
        store.shopDomain,
        accessToken,
        PRODUCT_SET,
        {
          input,
        },
      )) as {
        productSet?: {
          userErrors?: { message: string }[];
        };
      };
      const ue = data?.productSet?.userErrors;
      if (ue?.length) {
        errs.push(ue.map((e) => e.message).join(", "));
      }
    } catch (e) {
      errs.push(e instanceof Error ? e.message : String(e));
    }
  }

  const coll = collectionRows[0];
  const collTitle = coll?.title?.trim() || `${pack.name} (mock)`;
  try {
    const data = (await shopifyGraphQL(
      store.shopDomain,
      accessToken,
      COLLECTION_CREATE,
      {
        input: {
          title: collTitle,
          ruleSet: {
            appliedDisjunctively: false,
            rules: [
              {
                column: "TAG",
                relation: "EQUALS",
                condition: syntheticTag,
              },
            ],
          },
        },
      },
    )) as {
      collectionCreate?: { userErrors?: { message: string }[] };
    };
    const ue = data?.collectionCreate?.userErrors;
    if (ue?.length) {
      errs.push(`Collection: ${ue.map((e) => e.message).join(", ")}`);
    }
  } catch (e) {
    errs.push(`Collection: ${e instanceof Error ? e.message : String(e)}`);
  }

  const nCustomers = Math.min(customerRows.length, Math.max(1, requested));
  for (let i = 0; i < nCustomers; i++) {
    const c = customerRows[i % customerRows.length];
    const tags = (c.tags ?? "")
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
    tags.push(syntheticTag);
    try {
      const data = (await shopifyGraphQL(
        store.shopDomain,
        accessToken,
        CUSTOMER_CREATE,
        {
          input: {
            email: c.email,
            firstName: c.first_name ?? "",
            lastName: c.last_name ?? "",
            tags,
          },
        },
      )) as {
        customerCreate?: { userErrors?: { message: string }[] };
      };
      const ue = data?.customerCreate?.userErrors;
      if (ue?.length) {
        errs.push(`Customer: ${ue.map((e) => e.message).join(", ")}`);
      }
    } catch (e) {
      errs.push(
        `Customer ${c.email}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  if (errs.length > 0) {
    await prisma.mockGenerationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage: errs.slice(0, 8).join(" | "),
        completedAt: new Date(),
      },
    });
    return;
  }

  await prisma.mockGenerationJob.update({
    where: { id: jobId },
    data: {
      status: "SUCCEEDED",
      completedAt: new Date(),
    },
  });
}
