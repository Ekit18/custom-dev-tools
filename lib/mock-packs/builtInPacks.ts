/**
 * FR-012: minimal vertical templates so fresh tenants can run generation before uploading CSVs.
 * Bootstrapped into `MockDataPack` rows with source BUILT_IN (see `ensureBuiltInPacks`).
 */

export type BuiltInPackDefinition = {
  slug: string;
  name: string;
  description: string;
  productsCsv: string;
  collectionsCsv: string;
  customersCsv: string;
};

const electronicsProducts = `sku,title,body_html,vendor,product_type,price,tags,image_url_1
ELEC-001,Noise-Cancelling Headphones,"<p>Premium over-ear headphones.</p>",Acme Audio,Electronics,129.99,mock-electronics;electronics,
ELEC-002,USB-C Hub,"<p>7-in-1 hub with HDMI.</p>",Acme Audio,Electronics,45.00,mock-electronics;electronics,
`;

const electronicsCollections = `title,handle,rule_column,rule_relation,rule_condition,applied_disjunctively
Electronics,mock-electronics-coll,TAG,CONTAINS,mock-electronics,false
`;

const electronicsCustomers = `email,first_name,last_name,tags
buyer1.electronics@example.com,Alex,Taylor,mock-electronics
buyer2.electronics@example.com,Jordan,Reese,mock-electronics
`;

const apparelProducts = `sku,title,body_html,vendor,product_type,price,tags,image_url_1
APP-001,Organic Cotton Tee,"<p>Soft everyday tee.</p>",Stitch Co,Apparel,24.99,mock-apparel;apparel,
APP-002,Slim Fit Jeans,"<p>Indigo denim.</p>",Stitch Co,Apparel,79.00,mock-apparel;apparel,
`;

const apparelCollections = `title,handle,rule_column,rule_relation,rule_condition,applied_disjunctively
Apparel,mock-apparel-coll,TAG,CONTAINS,mock-apparel,false
`;

const apparelCustomers = `email,first_name,last_name,tags
buyer1.apparel@example.com,Casey,Morgan,mock-apparel
buyer2.apparel@example.com,Riley,Nguyen,mock-apparel
`;

export const BUILT_IN_PACKS: BuiltInPackDefinition[] = [
  {
    slug: "built-in-electronics",
    name: "Electronics (built-in)",
    description: "Sample headphones and hub with TAG mock-electronics.",
    productsCsv: electronicsProducts,
    collectionsCsv: electronicsCollections,
    customersCsv: electronicsCustomers,
  },
  {
    slug: "built-in-apparel",
    name: "Apparel (built-in)",
    description: "Sample tee and jeans with TAG mock-apparel.",
    productsCsv: apparelProducts,
    collectionsCsv: apparelCollections,
    customersCsv: apparelCustomers,
  },
];
