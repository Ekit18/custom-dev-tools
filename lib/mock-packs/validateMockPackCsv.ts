import { parse } from "csv-parse/sync";
import type {
  CollectionRow,
  CsvValidationError,
  CustomerRow,
  ParsedMockPack,
  ProductRow,
} from "./types";

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}

function maxRows(kind: "products" | "collections" | "customers"): number {
  const env =
    kind === "products"
      ? process.env.MOCK_PACK_MAX_PRODUCT_ROWS
      : kind === "collections"
        ? process.env.MOCK_PACK_MAX_COLLECTION_ROWS
        : process.env.MOCK_PACK_MAX_CUSTOMER_ROWS;
  const n = env ? Number.parseInt(env, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) return n;
  return kind === "products" ? 5000 : kind === "collections" ? 500 : 10_000;
}

function parseCsv(content: string): Record<string, string>[] {
  const text = stripBom(content);
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];
}

export function validateMockPackCsv(
  productsCsv: string,
  collectionsCsv: string,
  customersCsv: string,
):
  | { ok: true; data: ParsedMockPack }
  | { ok: false; errors: CsvValidationError[] } {
  const errors: CsvValidationError[] = [];

  let productRecords: Record<string, string>[] = [];
  let collectionRecords: Record<string, string>[] = [];
  let customerRecords: Record<string, string>[] = [];

  try {
    productRecords = parseCsv(productsCsv);
  } catch (e) {
    errors.push({
      file: "products",
      row: 0,
      message: `CSV parse error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  try {
    collectionRecords = parseCsv(collectionsCsv);
  } catch (e) {
    errors.push({
      file: "collections",
      row: 0,
      message: `CSV parse error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  try {
    customerRecords = parseCsv(customersCsv);
  } catch (e) {
    errors.push({
      file: "customers",
      row: 0,
      message: `CSV parse error: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const mrP = maxRows("products");
  const mrC = maxRows("collections");
  const mrU = maxRows("customers");
  if (productRecords.length > mrP) {
    errors.push({
      file: "products",
      row: 0,
      message: `Too many rows (max ${mrP})`,
    });
  }
  if (collectionRecords.length > mrC) {
    errors.push({
      file: "collections",
      row: 0,
      message: `Too many rows (max ${mrC})`,
    });
  }
  if (customerRecords.length > mrU) {
    errors.push({
      file: "customers",
      row: 0,
      message: `Too many rows (max ${mrU})`,
    });
  }
  if (productRecords.length === 0) {
    errors.push({
      file: "products",
      row: 0,
      message: "At least one product row is required",
    });
  }
  if (collectionRecords.length === 0) {
    errors.push({
      file: "collections",
      row: 0,
      message: "At least one collection row is required",
    });
  }
  if (customerRecords.length === 0) {
    errors.push({
      file: "customers",
      row: 0,
      message: "At least one customer row is required",
    });
  }

  const products: ProductRow[] = [];
  const skus = new Set<string>();

  for (let i = 0; i < productRecords.length; i++) {
    const row = productRecords[i];
    const line = i + 2;
    const sku = (row.sku ?? "").trim();
    const title = (row.title ?? "").trim();
    const price = (row.price ?? "").trim();
    if (!sku) {
      errors.push({ file: "products", row: line, message: "Missing sku" });
    }
    if (!title) {
      errors.push({ file: "products", row: line, message: "Missing title" });
    }
    if (!price) {
      errors.push({ file: "products", row: line, message: "Missing price" });
    }
    if (sku && skus.has(sku)) {
      errors.push({
        file: "products",
        row: line,
        message: `Duplicate sku "${sku}"`,
      });
    }
    if (sku) skus.add(sku);
    const priceNum = Number.parseFloat(price.replace(",", "."));
    if (price && Number.isNaN(priceNum)) {
      errors.push({ file: "products", row: line, message: "Invalid price" });
    }
    products.push({
      sku,
      title,
      body_html: row.body_html,
      vendor: row.vendor,
      product_type: row.product_type,
      price,
      compare_at_price: row.compare_at_price,
      inventory_qty: row.inventory_qty,
      tags: row.tags,
      image_url_1: row.image_url_1,
      image_url_2: row.image_url_2,
      image_url_3: row.image_url_3,
      image_url_4: row.image_url_4,
      image_url_5: row.image_url_5,
    });
  }

  const collections: CollectionRow[] = [];
  for (let i = 0; i < collectionRecords.length; i++) {
    const row = collectionRecords[i];
    const line = i + 2;
    const title = (row.title ?? "").trim();
    const rule_column = (row.rule_column ?? "").trim();
    const rule_relation = (row.rule_relation ?? "").trim();
    const rule_condition = (row.rule_condition ?? "").trim();
    if (!title) {
      errors.push({ file: "collections", row: line, message: "Missing title" });
    }
    if (!rule_column) {
      errors.push({
        file: "collections",
        row: line,
        message: "Missing rule_column",
      });
    }
    if (!rule_relation) {
      errors.push({
        file: "collections",
        row: line,
        message: "Missing rule_relation",
      });
    }
    if (!rule_condition) {
      errors.push({
        file: "collections",
        row: line,
        message: "Missing rule_condition",
      });
    }
    collections.push({
      title,
      handle: row.handle,
      rule_column,
      rule_relation,
      rule_condition,
      applied_disjunctively: row.applied_disjunctively,
    });
  }

  const customers: CustomerRow[] = [];
  const emails = new Set<string>();
  for (let i = 0; i < customerRecords.length; i++) {
    const row = customerRecords[i];
    const line = i + 2;
    const email = (row.email ?? "").trim().toLowerCase();
    if (!email) {
      errors.push({ file: "customers", row: line, message: "Missing email" });
    } else if (emails.has(email)) {
      errors.push({
        file: "customers",
        row: line,
        message: `Duplicate email "${email}"`,
      });
    } else {
      emails.add(email);
    }
    customers.push({
      email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      tags: row.tags,
      address1: row.address1,
      city: row.city,
      province_code: row.province_code,
      country_code: row.country_code,
      zip: row.zip,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      products,
      collections,
      customers,
      productRowCount: products.length,
      collectionRowCount: collections.length,
      customerRowCount: customers.length,
    },
  };
}
