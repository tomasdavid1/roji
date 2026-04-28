<?php
/**
 * Roji Child — Subscriptions / Autoship integration.
 *
 * Provider-agnostic layer around either the free 'Subscriptions for
 * WooCommerce' (WP Swings) plugin or the paid 'WooCommerce Subscriptions'
 * (Automattic) plugin. Reads roji_subs_provider() to dispatch.
 *
 * Roji's Wolverine/Recomp/Full stacks are sold both:
 *   - One-time: full price (e.g. $189)
 *   - Monthly autoship: ROJI_SUBS_DISCOUNT_PCT off + free shipping
 *
 * Implementation strategy:
 *   - The free plugin doesn't add a "variable subscription" product type.
 *     So we duplicate each stack into a "<name> – Autoship" sibling product
 *     with the discounted recurring price + plugin meta flags.
 *   - The protocol engine deep-link adds `?autoship=1` to land on the
 *     autoship variant; the cart page shows a toggle so customers can
 *     switch either way before checkout.
 *   - Dashboard MRR/active counts query the wps_subscriptions post type
 *     (or shop_subscription for paid plugin) via REST.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* -----------------------------------------------------------------------------
 * Product helpers
 * -------------------------------------------------------------------------- */

/**
 * Mark a WooCommerce simple product as a subscription with the Roji default
 * recurring config (monthly, no trial, indefinite).
 *
 * @param int   $product_id
 * @param float $recurring_price Discounted recurring price (the post-discount value).
 * @param array $opts            Optional override keys: interval_number, interval_unit,
 *                                                       free_trial_number, free_trial_unit.
 * @return true|WP_Error
 */
function roji_subs_mark_product_recurring( $product_id, $recurring_price, $opts = array() ) {
	$provider = roji_subs_provider();
	if ( $provider === 'none' ) {
		return new WP_Error( 'roji_subs_no_plugin', 'No subscription plugin active.' );
	}

	$opts = wp_parse_args(
		$opts,
		array(
			'interval_number'   => ROJI_SUBS_INTERVAL_NUMBER,
			'interval_unit'     => ROJI_SUBS_INTERVAL_UNIT,
			'free_trial_number' => 0,
			'free_trial_unit'   => 'day',
		)
	);

	$product = wc_get_product( $product_id );
	if ( ! $product ) {
		return new WP_Error( 'roji_subs_product_missing', 'Product not found.' );
	}

	if ( $provider === 'wps_sfw' ) {
		// Free plugin (WP Swings) — meta-flag-based.
		update_post_meta( $product_id, '_wps_sfw_product', 'yes' );
		update_post_meta( $product_id, 'wps_sfw_subscription_number', (int) $opts['interval_number'] );
		update_post_meta( $product_id, 'wps_sfw_subscription_interval', $opts['interval_unit'] );
		// Empty expiry = subscription runs indefinitely.
		update_post_meta( $product_id, 'wps_sfw_subscription_expiry_number', '' );
		update_post_meta( $product_id, 'wps_sfw_subscription_expiry_interval', $opts['interval_unit'] );
		update_post_meta( $product_id, 'wps_sfw_subscription_initial_signup_price', '' );
		update_post_meta( $product_id, 'wps_sfw_subscription_free_trial_number', (int) $opts['free_trial_number'] );
		update_post_meta( $product_id, 'wps_sfw_subscription_free_trial_interval', $opts['free_trial_unit'] );
	} elseif ( $provider === 'woocommerce_subscriptions' ) {
		// Paid plugin (Automattic) — uses _subscription_* meta and
		// product type 'subscription'. We'd also need to flip the
		// product type via wp_set_object_terms( ... 'product_type' ).
		wp_set_object_terms( $product_id, 'subscription', 'product_type' );
		update_post_meta( $product_id, '_subscription_price', (string) $recurring_price );
		update_post_meta( $product_id, '_subscription_period_interval', (int) $opts['interval_number'] );
		update_post_meta( $product_id, '_subscription_period', $opts['interval_unit'] );
		update_post_meta( $product_id, '_subscription_length', 0 );
		update_post_meta( $product_id, '_subscription_trial_length', (int) $opts['free_trial_number'] );
		update_post_meta( $product_id, '_subscription_trial_period', $opts['free_trial_unit'] );
		update_post_meta( $product_id, '_subscription_sign_up_fee', '' );
	}

	// Always set the recurring price as the regular price too, so the
	// product page shows the right number.
	update_post_meta( $product_id, '_regular_price', (string) $recurring_price );
	update_post_meta( $product_id, '_price', (string) $recurring_price );

	wc_delete_product_transients( $product_id );
	return true;
}

/**
 * Returns true if the given product is configured as recurring/subscription.
 */
function roji_subs_is_recurring_product( $product_id ) {
	$provider = roji_subs_provider();
	if ( $provider === 'wps_sfw' ) {
		return get_post_meta( $product_id, '_wps_sfw_product', true ) === 'yes';
	}
	if ( $provider === 'woocommerce_subscriptions' ) {
		$product = wc_get_product( $product_id );
		return $product && in_array( $product->get_type(), array( 'subscription', 'variable-subscription' ), true );
	}
	return false;
}

/**
 * Find the autoship sibling for a given one-time product, or null.
 * Convention: the autoship variant has post meta `_roji_autoship_for` = source product id.
 */
function roji_subs_get_autoship_sibling( $product_id ) {
	$q = new WP_Query(
		array(
			'post_type'      => 'product',
			'meta_key'       => '_roji_autoship_for',
			'meta_value'     => (int) $product_id,
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		)
	);
	return $q->have_posts() ? (int) $q->posts[0] : null;
}

/* -----------------------------------------------------------------------------
 * Provisioning — duplicate a one-time stack into an autoship sibling
 * -------------------------------------------------------------------------- */

/**
 * Idempotently create (or update) the autoship sibling for a one-time product.
 *
 * @param int $source_product_id A "one-time" simple product (e.g. Wolverine).
 * @return int|WP_Error Sibling product id.
 */
function roji_subs_ensure_autoship_sibling( $source_product_id ) {
	$source = wc_get_product( $source_product_id );
	if ( ! $source ) {
		return new WP_Error( 'roji_subs_source_missing', 'Source product not found.' );
	}
	if ( ! roji_subs_enabled() ) {
		return new WP_Error( 'roji_subs_no_plugin', 'No subscription plugin active.' );
	}

	$one_time_price  = (float) $source->get_regular_price();
	$discount_pct    = (float) ROJI_SUBS_DISCOUNT_PCT;
	$recurring_price = round( $one_time_price * ( 1 - ( $discount_pct / 100 ) ), 2 );

	$existing = roji_subs_get_autoship_sibling( $source_product_id );
	if ( $existing ) {
		// Update the recurring price + flags, but don't touch the title/SKU/etc.
		roji_subs_mark_product_recurring( $existing, $recurring_price );
		return $existing;
	}

	$sibling_id = wp_insert_post(
		array(
			'post_title'   => $source->get_name() . ' — Autoship',
			'post_status'  => 'publish',
			'post_type'    => 'product',
			'post_content' => $source->get_description(),
			'post_excerpt' => $source->get_short_description(),
		),
		true
	);
	if ( is_wp_error( $sibling_id ) ) {
		return $sibling_id;
	}

	wp_set_object_terms( $sibling_id, 'simple', 'product_type' );

	update_post_meta( $sibling_id, '_visibility', 'hidden' ); // not in shop loop, only via deep-link
	update_post_meta( $sibling_id, '_stock_status', 'instock' );
	update_post_meta( $sibling_id, '_sku', ( $source->get_sku() ?: 'roji' ) . '-AS' );
	update_post_meta( $sibling_id, '_roji_autoship_for', (int) $source_product_id );
	update_post_meta( $sibling_id, '_thumbnail_id', $source->get_image_id() );

	roji_subs_mark_product_recurring( $sibling_id, $recurring_price );

	// Mirror catalog visibility so search results don't surface duplicates.
	wp_set_object_terms( $sibling_id, 'hidden', 'product_visibility' );

	return (int) $sibling_id;
}

/**
 * Run the converter for all known Roji stacks. Idempotent. Called by an
 * admin-only WP-CLI command (`wp roji subs:provision`) and on plugin/theme
 * activation.
 *
 * @return array Map of source_id => sibling_id|WP_Error.
 */
function roji_subs_provision_all_stacks() {
	$stack_constants = array( 'ROJI_WOLVERINE_PRODUCT_ID', 'ROJI_RECOMP_PRODUCT_ID', 'ROJI_FULL_PRODUCT_ID' );
	$results         = array();
	foreach ( $stack_constants as $const ) {
		if ( ! defined( $const ) || (int) constant( $const ) === 0 ) {
			continue;
		}
		$source_id              = (int) constant( $const );
		$results[ $source_id ]  = roji_subs_ensure_autoship_sibling( $source_id );
	}
	return $results;
}

/* -----------------------------------------------------------------------------
 * Cart UX — autoship deep-link + toggle
 * -------------------------------------------------------------------------- */

/**
 * Two interception points for "swap to autoship sibling":
 *
 * 1. roji_product_id_for_stack — fires inside the protocol-engine deep-link
 *    handler when `?autoship=1` is present.
 * 2. woocommerce_add_to_cart_product_id — fires for the standard
 *    add-to-cart form/AJAX, so PDP "Add to cart" with `?autoship=1` query
 *    string also routes to the autoship sibling.
 */
function roji_subs_swap_for_autoship( $product_id ) {
	if ( empty( $_GET['autoship'] ) || ! roji_subs_enabled() ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return $product_id;
	}
	$autoship = wc_clean( wp_unslash( $_GET['autoship'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( $autoship !== '1' && $autoship !== 'true' ) {
		return $product_id;
	}
	$sibling = roji_subs_get_autoship_sibling( (int) $product_id );
	return $sibling ? $sibling : $product_id;
}
add_filter( 'roji_product_id_for_stack', 'roji_subs_swap_for_autoship', 10, 1 );
add_filter( 'woocommerce_add_to_cart_product_id', 'roji_subs_swap_for_autoship', 10, 1 );

/**
 * Render the "Save 15% with autoship" upsell at the top of the cart for
 * any one-time stack present. Lets customer one-click swap to autoship.
 */
add_action(
	'woocommerce_before_cart_table',
	function () {
		if ( ! roji_subs_enabled() ) {
			return;
		}
		$cart = WC()->cart;
		if ( ! $cart || $cart->is_empty() ) {
			return;
		}
		$has_one_time_with_sibling = false;
		foreach ( $cart->get_cart() as $item ) {
			$pid = (int) ( $item['product_id'] ?? 0 );
			if ( ! $pid ) {
				continue;
			}
			if ( roji_subs_is_recurring_product( $pid ) ) {
				continue; // already on autoship
			}
			if ( roji_subs_get_autoship_sibling( $pid ) ) {
				$has_one_time_with_sibling = true;
				break;
			}
		}
		if ( ! $has_one_time_with_sibling ) {
			return;
		}
		$discount_pct = (int) ROJI_SUBS_DISCOUNT_PCT;
		echo '<div class="roji-autoship-upsell" style="background:rgba(0,255,178,0.08);border:1px solid rgba(0,255,178,0.25);border-radius:8px;padding:14px 18px;margin:0 0 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
		echo '<div><strong>Save ' . esc_html( $discount_pct ) . '%</strong> with monthly autoship · free shipping · cancel anytime.</div>';
		echo '<form method="post" action="" style="margin:0;"><input type="hidden" name="roji_swap_to_autoship" value="1"><button type="submit" class="button alt">Switch to autoship</button>' . wp_nonce_field( 'roji_swap_to_autoship', '_rsa_nonce', true, false ) . '</form>';
		echo '</div>';
	},
	5
);

/**
 * Handle the "Switch to autoship" form submit — replace each one-time item
 * with its autoship sibling, preserving quantity.
 */
add_action(
	'template_redirect',
	function () {
		if ( empty( $_POST['roji_swap_to_autoship'] ) ) {
			return;
		}
		if ( ! isset( $_POST['_rsa_nonce'] ) || ! wp_verify_nonce( wp_unslash( $_POST['_rsa_nonce'] ), 'roji_swap_to_autoship' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			return;
		}
		$cart = WC()->cart;
		if ( ! $cart || $cart->is_empty() ) {
			return;
		}
		$swaps = array();
		foreach ( $cart->get_cart() as $item_key => $item ) {
			$pid = (int) ( $item['product_id'] ?? 0 );
			if ( roji_subs_is_recurring_product( $pid ) ) {
				continue;
			}
			$sibling = roji_subs_get_autoship_sibling( $pid );
			if ( $sibling ) {
				$swaps[] = array( $item_key, $sibling, (int) $item['quantity'] );
			}
		}
		foreach ( $swaps as list( $key, $sibling_id, $qty ) ) {
			$cart->remove_cart_item( $key );
			$cart->add_to_cart( $sibling_id, $qty );
		}
		if ( ! empty( $swaps ) ) {
			wc_add_notice( sprintf( __( 'Switched %d item(s) to monthly autoship. You can cancel anytime from your account.', 'roji-child' ), count( $swaps ) ), 'success' );
		}
		wp_safe_redirect( wc_get_cart_url() );
		exit;
	}
);

/* -----------------------------------------------------------------------------
 * Free shipping for autoship orders
 *
 * If the cart contains only autoship products and ROJI_SUBS_FREE_SHIPPING is
 * on, hide all paid shipping methods so "Free shipping" is auto-selected.
 * -------------------------------------------------------------------------- */

add_filter(
	'woocommerce_package_rates',
	function ( $rates ) {
		if ( ! ROJI_SUBS_FREE_SHIPPING || ! roji_subs_enabled() ) {
			return $rates;
		}
		$cart = WC()->cart;
		if ( ! $cart || $cart->is_empty() ) {
			return $rates;
		}
		$all_autoship = true;
		foreach ( $cart->get_cart() as $item ) {
			$pid = (int) ( $item['product_id'] ?? 0 );
			if ( ! roji_subs_is_recurring_product( $pid ) ) {
				$all_autoship = false;
				break;
			}
		}
		if ( ! $all_autoship ) {
			return $rates;
		}
		$free = array();
		foreach ( $rates as $rate_id => $rate ) {
			if ( 'free_shipping' === $rate->method_id ) {
				$free[ $rate_id ] = $rate;
			}
		}
		return ! empty( $free ) ? $free : $rates;
	},
	100,
	1
);

/* -----------------------------------------------------------------------------
 * Auto-provisioning: when the site loads and our stacks are present, ensure
 * autoship siblings exist. Cached via transient so it only runs once per day.
 * -------------------------------------------------------------------------- */

add_action(
	'init',
	function () {
		if ( wp_doing_ajax() || wp_doing_cron() ) {
			return;
		}
		if ( ! is_admin() ) {
			return; // only run when an admin loads any wp-admin page
		}
		if ( ! roji_subs_enabled() ) {
			return;
		}
		if ( get_transient( 'roji_subs_provisioned' ) ) {
			return;
		}
		roji_subs_provision_all_stacks();
		set_transient( 'roji_subs_provisioned', 1, DAY_IN_SECONDS );
	},
	100
);

/* -----------------------------------------------------------------------------
 * WP-CLI: wp roji subs:provision  /  wp roji subs:status
 * -------------------------------------------------------------------------- */

/* -----------------------------------------------------------------------------
 * REST API — `GET /wp-json/roji/v1/subscriptions/metrics`
 *
 * Read-only aggregate metrics consumed by the Ads dashboard.
 * Auth via shared secret in the `X-Roji-Token` header (must match the
 * ROJI_INTERNAL_API_TOKEN constant). No PII in the response.
 *
 * Provider-aware: queries the right post type / status meta for whichever
 * subscription plugin is active.
 * -------------------------------------------------------------------------- */

if ( ! defined( 'ROJI_INTERNAL_API_TOKEN' ) ) {
	define( 'ROJI_INTERNAL_API_TOKEN', '' );
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'roji/v1',
			'/subscriptions/metrics',
			array(
				'methods'             => 'GET',
				'callback'            => 'roji_subs_rest_metrics',
				'permission_callback' => function ( $req ) {
					if ( ROJI_INTERNAL_API_TOKEN === '' ) {
						return false; // not configured = blocked
					}
					$got = $req->get_header( 'x-roji-token' );
					return is_string( $got ) && hash_equals( ROJI_INTERNAL_API_TOKEN, $got );
				},
			)
		);
	}
);

/**
 * Returns aggregate subscription metrics:
 *   - active count, on-hold count, cancelled count (all-time)
 *   - MRR (sum of recurring price for all active subs)
 *   - ARPU (MRR / active count)
 *   - churn (cancellations in last 30d / active 30d ago)
 *   - last 10 cancellations (no PII, just date + amount)
 */
function roji_subs_rest_metrics() {
	$provider = roji_subs_provider();
	if ( $provider === 'none' ) {
		return new WP_REST_Response(
			array(
				'provider' => 'none',
				'enabled'  => false,
				'message'  => 'No subscription plugin active.',
			),
			200
		);
	}

	$post_type   = $provider === 'wps_sfw' ? 'wps_subscriptions' : 'shop_subscription';
	$status_meta = $provider === 'wps_sfw' ? 'wps_subscription_status' : null;
	$price_meta  = $provider === 'wps_sfw' ? 'wps_subscription_recurring_total' : '_subscription_price';

	// Count by status. For free plugin, status is in meta. For paid plugin,
	// status is the post_status itself with `wc-` prefix.
	$counts = roji_subs_count_by_status( $post_type, $status_meta, $provider );

	// MRR: sum of recurring totals for all active subs.
	$mrr = roji_subs_sum_active_recurring( $post_type, $status_meta, $price_meta, $provider );

	$active = (int) ( $counts['active'] ?? 0 );
	$arpu   = $active > 0 ? round( $mrr / $active, 2 ) : 0;

	// Churn: cancellations in last 30 days vs active 30 days ago.
	$cancels_30d = roji_subs_count_recent_status( $post_type, $status_meta, 'cancelled', 30, $provider );
	$active_30d  = $active + $cancels_30d; // approximation: active count 30d ago
	$churn_pct   = $active_30d > 0 ? round( ( $cancels_30d / $active_30d ) * 100, 1 ) : 0;

	$recent_cancels = roji_subs_recent_cancellations( $post_type, $status_meta, $price_meta, $provider, 10 );

	return new WP_REST_Response(
		array(
			'provider'           => $provider,
			'enabled'            => true,
			'currency'           => get_woocommerce_currency(),
			'mrr'                => round( $mrr, 2 ),
			'arpu'               => $arpu,
			'churn_pct_30d'      => $churn_pct,
			'counts'             => $counts,
			'recent_cancellations' => $recent_cancels,
			'as_of'              => current_time( 'c' ),
		),
		200
	);
}

function roji_subs_count_by_status( $post_type, $status_meta, $provider ) {
	global $wpdb;
	$out = array( 'active' => 0, 'on-hold' => 0, 'cancelled' => 0, 'expired' => 0, 'pending' => 0 );
	if ( $provider === 'wps_sfw' ) {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT pm.meta_value AS status, COUNT(*) AS n
				 FROM {$wpdb->postmeta} pm
				 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
				 WHERE pm.meta_key = %s AND p.post_type = %s
				 GROUP BY pm.meta_value",
				$status_meta,
				$post_type
			)
		);
		foreach ( $rows as $r ) {
			$out[ $r->status ] = (int) $r->n;
		}
	} else {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT post_status, COUNT(*) AS n FROM {$wpdb->posts}
				 WHERE post_type = %s GROUP BY post_status",
				$post_type
			)
		);
		foreach ( $rows as $r ) {
			$key = preg_replace( '/^wc-/', '', $r->post_status );
			$out[ $key ] = (int) $r->n;
		}
	}
	return $out;
}

function roji_subs_sum_active_recurring( $post_type, $status_meta, $price_meta, $provider ) {
	global $wpdb;
	if ( $provider === 'wps_sfw' ) {
		$total = (float) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COALESCE(SUM(CAST(price.meta_value AS DECIMAL(10,2))), 0)
				 FROM {$wpdb->posts} p
				 INNER JOIN {$wpdb->postmeta} status ON status.post_id = p.ID AND status.meta_key = %s AND status.meta_value = 'active'
				 LEFT JOIN {$wpdb->postmeta} price ON price.post_id = p.ID AND price.meta_key = %s
				 WHERE p.post_type = %s",
				$status_meta,
				$price_meta,
				$post_type
			)
		);
	} else {
		$total = (float) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COALESCE(SUM(CAST(price.meta_value AS DECIMAL(10,2))), 0)
				 FROM {$wpdb->posts} p
				 LEFT JOIN {$wpdb->postmeta} price ON price.post_id = p.ID AND price.meta_key = %s
				 WHERE p.post_type = %s AND p.post_status = 'wc-active'",
				$price_meta,
				$post_type
			)
		);
	}
	return $total;
}

function roji_subs_count_recent_status( $post_type, $status_meta, $status, $days, $provider ) {
	global $wpdb;
	$cutoff = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );
	if ( $provider === 'wps_sfw' ) {
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(*)
				 FROM {$wpdb->posts} p
				 INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = %s AND pm.meta_value = %s
				 WHERE p.post_type = %s AND p.post_modified_gmt >= %s",
				$status_meta,
				$status,
				$post_type,
				$cutoff
			)
		);
	}
	return (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->posts}
			 WHERE post_type = %s AND post_status = %s AND post_modified_gmt >= %s",
			$post_type,
			'wc-' . $status,
			$cutoff
		)
	);
}

function roji_subs_recent_cancellations( $post_type, $status_meta, $price_meta, $provider, $limit ) {
	global $wpdb;
	$limit = (int) $limit;
	if ( $provider === 'wps_sfw' ) {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.ID, p.post_modified_gmt, COALESCE(price.meta_value, '0') AS amount
				 FROM {$wpdb->posts} p
				 INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID AND pm.meta_key = %s AND pm.meta_value = 'cancelled'
				 LEFT JOIN {$wpdb->postmeta} price ON price.post_id = p.ID AND price.meta_key = %s
				 WHERE p.post_type = %s
				 ORDER BY p.post_modified_gmt DESC
				 LIMIT %d",
				$status_meta,
				$price_meta,
				$post_type,
				$limit
			)
		);
	} else {
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.ID, p.post_modified_gmt, COALESCE(price.meta_value, '0') AS amount
				 FROM {$wpdb->posts} p
				 LEFT JOIN {$wpdb->postmeta} price ON price.post_id = p.ID AND price.meta_key = %s
				 WHERE p.post_type = %s AND p.post_status = 'wc-cancelled'
				 ORDER BY p.post_modified_gmt DESC LIMIT %d",
				$price_meta,
				$post_type,
				$limit
			)
		);
	}
	return array_map(
		fn( $r ) => array(
			'id'            => (int) $r->ID,
			'cancelled_at'  => $r->post_modified_gmt,
			'amount'        => (float) $r->amount,
		),
		$rows ?? array()
	);
}

/* -----------------------------------------------------------------------------
 * WP-CLI: wp roji subs:provision  /  wp roji subs:status
 * -------------------------------------------------------------------------- */

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'roji subs:provision',
		function () {
			if ( ! roji_subs_enabled() ) {
				WP_CLI::error( 'No subscription plugin active. Install one first.' );
			}
			$results = roji_subs_provision_all_stacks();
			foreach ( $results as $source => $result ) {
				if ( is_wp_error( $result ) ) {
					WP_CLI::warning( "Source #{$source}: " . $result->get_error_message() );
				} else {
					WP_CLI::success( "Source #{$source} -> Autoship sibling #{$result}" );
				}
			}
		}
	);
	WP_CLI::add_command(
		'roji subs:status',
		function () {
			WP_CLI::log( 'Provider: ' . roji_subs_provider() );
			WP_CLI::log( 'Discount %: ' . ROJI_SUBS_DISCOUNT_PCT );
			WP_CLI::log( 'Interval: ' . ROJI_SUBS_INTERVAL_NUMBER . ' ' . ROJI_SUBS_INTERVAL_UNIT );
			WP_CLI::log( 'Free shipping: ' . ( ROJI_SUBS_FREE_SHIPPING ? 'yes' : 'no' ) );
			WP_CLI::log( 'Dunning delays (days): ' . ROJI_SUBS_DUNNING_DELAYS );
			foreach ( array( 'ROJI_WOLVERINE_PRODUCT_ID', 'ROJI_RECOMP_PRODUCT_ID', 'ROJI_FULL_PRODUCT_ID' ) as $c ) {
				if ( ! defined( $c ) ) {
					continue;
				}
				$src     = (int) constant( $c );
				$sibling = $src ? roji_subs_get_autoship_sibling( $src ) : null;
				WP_CLI::log( sprintf( '%-30s src=%-4d  autoship=%s', $c, $src, $sibling ? '#' . $sibling : '(none)' ) );
			}
		}
	);
}
