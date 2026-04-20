export type MockPackSourceDto = "UPLOADED" | "BUILT_IN";
export type MockPackStatusDto = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type CsvValidationError = {
  file: "products" | "collections" | "customers";
  row: number;
  message: string;
};

export type ProductRow = {
  sku: string;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  price: string;
  compare_at_price?: string;
  inventory_qty?: string;
  tags?: string;
  image_url_1?: string;
  image_url_2?: string;
  image_url_3?: string;
  image_url_4?: string;
  image_url_5?: string;
};

export type CollectionRow = {
  title: string;
  handle?: string;
  rule_column: string;
  rule_relation: string;
  rule_condition: string;
  applied_disjunctively?: string;
};

export type CustomerRow = {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  tags?: string;
  address1?: string;
  city?: string;
  province_code?: string;
  country_code?: string;
  zip?: string;
};

export type ParsedMockPack = {
  products: ProductRow[];
  collections: CollectionRow[];
  customers: CustomerRow[];
  productRowCount: number;
  collectionRowCount: number;
  customerRowCount: number;
};

export type MockPackListItem = {
  id: string;
  slug: string;
  name: string;
  source: MockPackSourceDto;
  status: MockPackStatusDto;
  description: string | null;
  createdAt: string;
  rowCounts: {
    products: number;
    collections: number;
    customers: number;
  };
};
