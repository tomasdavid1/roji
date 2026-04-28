/**
 * Internal accessor for the Google Ads Customer instance.
 *
 * Lives in its own file so other server modules (notably the blueprint
 * provisioner) can grab the configured client without importing the
 * full google-ads.ts module — which is large and re-exports a lot of
 * dashboard-facing types we don't need here.
 *
 * Server-only.
 */

import "server-only";
import { GoogleAdsApi, type Customer } from "google-ads-api";

let _client: GoogleAdsApi | null = null;
let _customer: Customer | null = null;

export function _internalClient(): GoogleAdsApi {
  if (_client) return _client;
  _client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  return _client;
}

export function _internalCustomer(): Customer {
  if (_customer) return _customer;
  _customer = _internalClient().Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  });
  return _customer;
}
