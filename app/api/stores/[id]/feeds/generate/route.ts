import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import path from "path";
import os from "os";
import { parse } from "csv-parse";
import { decrypt, encrypt } from "@/lib/encryption";
import { getAccessToken } from '@/lib/access-token';
import { prisma } from '@/lib/db';


// Helper to get locationId from Shopify
async function getLocation(shopDomain: string, accessToken: string) {
  const query = `#graphql\nquery { location { id } }`;
  const data = await shopifyGraphQL(shopDomain, accessToken, query);
  return data?.location?.id;
}

// Helper to download file from URL to temp directory
async function downloadFileToTemp(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const tempDir = os.tmpdir();
  const fileName = `feed-${Date.now()}-${Math.random().toString(36).substring(7)}.csv`;
  const filePath = path.join(tempDir, fileName);
  
  await fs.writeFile(filePath, Buffer.from(buffer));
  return filePath;
}

// Helper to read only the required number of rows from CSV file
async function readCsvRows(filePath: string, maxRows: number): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    let rowCount = 0;
    
    const parser = createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }));
    
    parser.on('data', (record) => {
      if (rowCount < maxRows) {
        records.push(record);
        rowCount++;
      }
      
      // Stop reading once we have enough rows
      if (rowCount >= maxRows) {
        parser.destroy();
      }
    });
    
    parser.on('end', () => {
      resolve(records);
    });
    
    parser.on('error', (error) => {
      reject(error);
    });
    
    parser.on('close', () => {
      resolve(records);
    });
  });
}

async function shopifyGraphQL(shopDomain: string, accessToken: string, query: string, variables: any = {}) {
  const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(data.errors ? JSON.stringify(data.errors) : res.statusText);
  }
  return data.data;
}

function mapCsvRowToProduct(row: any, locationId: string) {
  // Gather all image fields (Image 1, Image 2, ..., image_14, etc.)
  const imageUrls = Object.keys(row)
    .filter((k) => /^image[ _-]?\d+$/i.test(k.replace('Image', 'image')) || /^Image[ _-]?\d+$/i.test(k))
    .map((k) => row[k])
    .filter((v) => typeof v === 'string' && v.startsWith('http'));

  // Also check for a single 'Image' or 'images' field (comma separated)
  if (row.Image) {
    imageUrls.push(...row.Image.split(',').map((v: string) => v.trim()).filter(Boolean));
  }
  if (row.images) {
    imageUrls.push(...row.images.split(',').map((v: string) => v.trim()).filter(Boolean));
  }

  // Parse price as a valid number string, fallback to '0.00'
  let priceRaw = row['Webshop price'] || row['B2B price'] || row.price || row.Price || '';
  let price = '0.00';
  if (typeof priceRaw === 'string') {
    // Remove any non-numeric (except dot and comma) and try parse
    const priceNum = parseFloat(priceRaw.replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!isNaN(priceNum)) price = priceNum.toFixed(2);
  } else if (typeof priceRaw === 'number') {
    price = priceRaw.toFixed(2);
  }

  // Parse weight as a valid number, only set if valid
  let weight = undefined;
  if (row.Weight) {
    const weightNum = parseFloat(String(row.Weight).replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (!isNaN(weightNum)) weight = weightNum;
  }
  console.log("Row:" + JSON.stringify(row));

  // Only set barcode if it looks like a valid EAN/UPC (all digits, 8-14 chars)
  let barcode = row.EAN || row.barcode || row.Barcode || undefined;
  if (barcode && !/^\d{8,14}$/.test(barcode)) barcode = undefined;

  // Generate random quantity between 1 and 100
  const randomQuantity = Math.floor(Math.random() * 100) + 1;
  const product: any = {
    title: row.Title || row.title || row.Product_title || 'Untitled',
    handle: row.handle || row.Handle || undefined,
    descriptionHtml: row.HTML_description || row.Description || row.descriptionHtml || row.body_html || '',
    productType: row.product_type || row.ProductType || '',
    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
    vendor: row.Brand || 'Shopify tools',
    status: 'ACTIVE',
    productOptions: [
      { name: 'Title', values: [{ name: 'Default Title' }] },
    ],
    variants: [
      {
        optionValues: [{ optionName: 'Title', name: 'Default Title' }],
        price,
        sku: row.SKU || row.sku || undefined,
        barcode,
        taxable: true,
        inventoryItem: {
          tracked: true,
        },
        inventoryQuantities: locationId ? [
          {
            quantity: randomQuantity,
            locationId,
            name: 'available',
          },
        ] : [],
      },
    ],
    files: imageUrls.map((img: string) => ({
      contentType: 'IMAGE',
      originalSource: img,
    })),
    metafields: [], // Add mapping if needed
    seo: {
      title: (row.Title || row.title || row.Product_title || 'Untitled').substring(0, 50),
      description: (row.HTML_description || row.Description || row.descriptionHtml || row.body_html || '').replace(/<[^>]+>/g, '').substring(0, 150),
    },
  };
  // No need to add inventoryQuantities here, handled above
  // Add weight if present and valid
  if (typeof weight === 'number') {
    product.variants[0].inventoryItem.measurement = {
      weight: { value: weight, unit: 'KILOGRAMS' },
    };
  }
  return product;
}

const PRODUCT_MUTATION = `#graphql\nmutation productSet($input: ProductSetInput!) {\n  productSet(input: $input) {\n    product {\n      id\n      title\n    }\n    userErrors {\n      field\n      message\n    }\n  }\n}`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let tempFilePath: string | null = null;
  
  try {
    const { id: storeId } = await params;
    const { count } = await request.json();
    
    if (!storeId || !count || count < 1) {
      return NextResponse.json({ error: "Invalid store or count" }, { status: 400 });
    }
    const feedUrl = process.env.PRODUCT_FEED_URL;

    if (!feedUrl) {
      return NextResponse.json({ error: "Feed URL not configured" }, { status: 500 });
    }
    
    // Get store info and access token
    const store = await prisma.store.findFirst({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ error: "Store or access token not found" }, { status: 404 });
    }

    const decryptedClientSecret = decrypt(store.clientSecret);
    const { accessToken, expiresIn, fresh } = await getAccessToken(store.id, store.shopDomain, store.clientId, decryptedClientSecret);
    if (fresh) {
      await prisma.store.update({
        where: { id: store.id },
        data: {
          adminAccessToken: encrypt(accessToken),
          expireAt: new Date(Date.now() + expiresIn * 1000),
        },
      });
    }
    
    // Get locationId from Shopify
    const locationId = await getLocation(store.shopDomain, accessToken);
    
    // Download CSV file to temp directory
    tempFilePath = await downloadFileToTemp(feedUrl);

    // Read only the required number of rows from CSV file
    const records = await readCsvRows(tempFilePath, count);
    
    // Map records to products
    const products = records.map((obj: any) => {
      return mapCsvRowToProduct(obj, locationId);
    });
    
    let created = 0;
    let errors: any[] = [];
    
    for (const product of products) {
      try {
        const data = await shopifyGraphQL(store.shopDomain, accessToken, PRODUCT_MUTATION, { input: product });
        if (data.productSet.userErrors && data.productSet.userErrors.length) {
          errors.push({ title: product.title, errors: data.productSet.userErrors });
        } else {
          created++;
        }
      } catch (err: any) {
        console.log(err)
        errors.push({ title: product.title, error: err.message });
      }
    }
    
    return NextResponse.json({ ok: true, created, errors });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    // Clean up: delete the temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }
  }
}
