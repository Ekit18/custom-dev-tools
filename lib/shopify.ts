export async function uninstallApp(shop: string, accessToken: string): Promise<boolean> {
  try {
    const url = `https://${shop}/admin/api_permissions/current.json`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': '0',
        'X-Shopify-Access-Token': accessToken,
      },
    });
    if (response.status === 200) {
      return true;
    } else {
      console.error('Failed to uninstall app:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error uninstalling app:', error);
    return false;
  }
}

export function validateShopDomain(domain: string): boolean {
  const shopifyDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  return shopifyDomainRegex.test(domain);
}
