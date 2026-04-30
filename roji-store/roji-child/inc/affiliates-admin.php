<?php
/**
 * Roji Child — Affiliate admin payout tool.
 *
 * Adds a "Payouts" submenu under WP Admin → Affiliates. Lists all
 * `approved` commissions ready to pay, grouped by affiliate, with:
 *
 *   - Bulk "mark as paid" with a payout reference (e.g. PayPal txn ID)
 *   - CSV export of approved/paid commissions for accounting
 *   - Per-affiliate totals (so you can pay one envelope per person)
 *   - Audit log: every status flip writes a postmeta entry on the
 *     commission with the operator + timestamp + reference.
 *
 * Why a custom UI instead of leaning on the default post-type list?
 * The default WP list view doesn't aggregate by affiliate or batch
 * across multiple commissions — you'd have to click each one. With ~50+
 * commissions/month that gets tedious, and operator errors lose money.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const ROJI_AFF_PAYOUTS_CAP = 'manage_woocommerce';

/* -----------------------------------------------------------------------------
 * Submenu registration
 * -------------------------------------------------------------------------- */

add_action(
	'admin_menu',
	function () {
		add_submenu_page(
			'edit.php?post_type=' . ROJI_AFF_POST_TYPE,
			'Affiliate payouts',
			'Payouts',
			ROJI_AFF_PAYOUTS_CAP,
			'roji-aff-payouts',
			'roji_aff_render_payouts_page'
		);
	},
	20
);

/* -----------------------------------------------------------------------------
 * Page renderer
 * -------------------------------------------------------------------------- */

function roji_aff_render_payouts_page() {
	if ( ! current_user_can( ROJI_AFF_PAYOUTS_CAP ) ) {
		wp_die( 'Insufficient permissions.' );
	}

	$flash    = '';
	$flash_t  = 'success';

	// Handle CSV export first (no headers sent yet from WP admin shell).
	if ( isset( $_GET['roji_export'] ) && wp_verify_nonce( wp_unslash( $_GET['_wpnonce'] ?? '' ), 'roji_aff_export' ) ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		roji_aff_export_csv( sanitize_text_field( wp_unslash( $_GET['roji_export'] ) ) );
		exit;
	}

	// Handle bulk-mark-paid.
	if ( isset( $_POST['roji_aff_payout_action'] ) && check_admin_referer( 'roji_aff_payout', '_rojiaffpaynonce' ) ) {
		$ids       = array_map( 'intval', (array) ( $_POST['comm_ids'] ?? array() ) );
		$reference = sanitize_text_field( wp_unslash( $_POST['payout_reference'] ?? '' ) );
		$result    = roji_aff_mark_commissions_paid( $ids, $reference );
		$flash     = sprintf(
			'Marked %d commission%s paid (%s)%s.',
			$result['count'],
			$result['count'] === 1 ? '' : 's',
			'$' . number_format( $result['total'], 2 ),
			$reference !== '' ? " — ref {$reference}" : ''
		);
		$flash_t = $result['count'] > 0 ? 'success' : 'warning';
	}

	// Pull approved (payable) commissions, oldest first so we pay FIFO.
	$payable = get_posts(
		array(
			'post_type'      => ROJI_COMM_POST_TYPE,
			'meta_key'       => '_roji_comm_status',
			'meta_value'     => 'approved',
			'posts_per_page' => 200,
			'orderby'        => 'date',
			'order'          => 'ASC',
		)
	);

	// Group by affiliate so you pay each person in one go.
	$by_aff = array();
	foreach ( $payable as $p ) {
		$aff_id    = (int) get_post_meta( $p->ID, '_roji_comm_affiliate_id', true );
		$amount    = (float) get_post_meta( $p->ID, '_roji_comm_amount', true );
		$by_aff[ $aff_id ] = $by_aff[ $aff_id ] ?? array(
			'commissions' => array(),
			'total'       => 0.0,
		);
		$by_aff[ $aff_id ]['commissions'][] = $p;
		$by_aff[ $aff_id ]['total']        += $amount;
	}
	uasort( $by_aff, fn( $a, $b ) => $b['total'] <=> $a['total'] );

	// Pull recent paid commissions for context.
	$recently_paid = get_posts(
		array(
			'post_type'      => ROJI_COMM_POST_TYPE,
			'meta_key'       => '_roji_comm_status',
			'meta_value'     => 'paid',
			'posts_per_page' => 20,
			'orderby'        => 'modified',
			'order'          => 'DESC',
		)
	);

	$total_payable = array_sum( array_column( $by_aff, 'total' ) );
	$export_pending_url = wp_nonce_url(
		add_query_arg( array( 'roji_export' => 'approved' ) ),
		'roji_aff_export'
	);
	$export_paid_url = wp_nonce_url(
		add_query_arg( array( 'roji_export' => 'paid' ) ),
		'roji_aff_export'
	);
	?>
	<style>
		.roji-payout-wrap { max-width: 1200px; }
		.roji-payout-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 16px 0 24px; }
		.roji-payout-summary .stat { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 14px; }
		.roji-payout-summary .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
		.roji-payout-summary .stat .value { font-family: monospace; font-size: 1.6rem; font-weight: 600; margin-top: 4px; color: #1d2327; }
		.roji-payout-actions { display: flex; gap: 8px; margin-bottom: 18px; }
		.roji-payout-aff { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 0; margin-bottom: 14px; overflow: hidden; }
		.roji-payout-aff > header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #f6f7f7; border-bottom: 1px solid #ccd0d4; gap: 12px; flex-wrap: wrap; }
		.roji-payout-aff > header .who { font-weight: 600; }
		.roji-payout-aff > header .who small { color: #666; font-weight: normal; margin-left: 8px; }
		.roji-payout-aff > header .who .payout-email { display: block; font-size: 12px; color: #2271b1; font-family: monospace; margin-top: 2px; }
		.roji-payout-aff > header .total { font-family: monospace; font-size: 1.3rem; font-weight: 700; color: #1d2327; }
		.roji-payout-aff table { width: 100%; border-collapse: collapse; font-size: 13px; }
		.roji-payout-aff th, .roji-payout-aff td { padding: 8px 18px; text-align: left; border-bottom: 1px solid #f0f0f1; }
		.roji-payout-aff thead th { background: #f6f7f7; font-weight: 600; color: #50575e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
		.roji-payout-aff tbody tr:last-child td { border-bottom: none; }
		.roji-payout-aff .amt { font-family: monospace; font-weight: 600; }
		.roji-payout-empty { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 32px; text-align: center; color: #50575e; }
		.roji-payout-form { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 18px; margin-bottom: 24px; }
		.roji-payout-form label { display: block; font-weight: 600; margin-bottom: 6px; }
		.roji-payout-form input[type=text] { width: 320px; }
		.roji-payout-recent { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 0; margin-top: 32px; }
		.roji-payout-recent header { padding: 12px 18px; border-bottom: 1px solid #f0f0f1; font-weight: 600; }
		.roji-payout-recent table { width: 100%; border-collapse: collapse; font-size: 13px; }
		.roji-payout-recent th, .roji-payout-recent td { padding: 8px 18px; text-align: left; border-bottom: 1px solid #f0f0f1; }
	</style>

	<div class="wrap roji-payout-wrap">
		<h1>Affiliate payouts</h1>

		<?php if ( $flash ) : ?>
			<div class="notice notice-<?php echo esc_attr( $flash_t ); ?> is-dismissible"><p><?php echo esc_html( $flash ); ?></p></div>
		<?php endif; ?>

		<div class="roji-payout-summary">
			<div class="stat">
				<div class="label">Payable now</div>
				<div class="value">$<?php echo esc_html( number_format( $total_payable, 2 ) ); ?></div>
			</div>
			<div class="stat">
				<div class="label">Affiliates owed</div>
				<div class="value"><?php echo esc_html( count( $by_aff ) ); ?></div>
			</div>
			<div class="stat">
				<div class="label">Approved commissions</div>
				<div class="value"><?php echo esc_html( count( $payable ) ); ?></div>
			</div>
		</div>

		<div class="roji-payout-actions">
			<a class="button" href="<?php echo esc_url( $export_pending_url ); ?>">Export approved (CSV)</a>
			<a class="button" href="<?php echo esc_url( $export_paid_url ); ?>">Export paid (CSV)</a>
		</div>

		<?php if ( empty( $by_aff ) ) : ?>
			<div class="roji-payout-empty">
				No commissions are payable right now. Pending commissions auto-promote to <strong>approved</strong> after the <?php echo esc_html( (int) ROJI_AFF_LOCK_DAYS ); ?>-day lock window.
			</div>
		<?php else : ?>
			<form method="post" action="">
				<?php wp_nonce_field( 'roji_aff_payout', '_rojiaffpaynonce' ); ?>
				<div class="roji-payout-form">
					<label for="payout_reference">Payout reference (recorded on each commission for audit)</label>
					<input type="text" id="payout_reference" name="payout_reference" placeholder="e.g. PayPal batch 2026-04-28-A" maxlength="120" />
					<p class="description">Tip: select all rows under an affiliate, click <strong>Mark selected as paid</strong>, then move on to the next.</p>
				</div>

				<?php foreach ( $by_aff as $aff_id => $g ) :
					$post     = get_post( $aff_id );
					$code     = (string) get_post_meta( $aff_id, '_roji_aff_code', true );
					$payout_e = (string) get_post_meta( $aff_id, '_roji_aff_payout_email', true );
				?>
					<section class="roji-payout-aff">
						<header>
							<div class="who">
								<?php echo esc_html( $post ? $post->post_title : ( '#' . $aff_id ) ); ?>
								<small>code <code><?php echo esc_html( $code ); ?></code> · <?php echo esc_html( count( $g['commissions'] ) ); ?> commission<?php echo count( $g['commissions'] ) === 1 ? '' : 's'; ?></small>
								<?php if ( $payout_e ) : ?>
									<span class="payout-email">→ <?php echo esc_html( $payout_e ); ?></span>
								<?php else : ?>
									<span class="payout-email" style="color:#d63638;">⚠ No payout email on file</span>
								<?php endif; ?>
							</div>
							<div class="total">$<?php echo esc_html( number_format( $g['total'], 2 ) ); ?></div>
						</header>
						<table>
							<thead>
								<tr>
									<th style="width:30px;"><input type="checkbox" onclick="(function(c){var b=c.closest('section');b.querySelectorAll('input[name=\\'comm_ids[]\\']').forEach(function(i){i.checked=c.checked;});})(this)"></th>
									<th>Date</th>
									<th>Order</th>
									<th>Type</th>
									<th>Subtotal</th>
									<th>Rate</th>
									<th>Commission</th>
								</tr>
							</thead>
							<tbody>
							<?php foreach ( $g['commissions'] as $c ) :
								$pct      = (float) get_post_meta( $c->ID, '_roji_comm_pct', true );
								$amount   = (float) get_post_meta( $c->ID, '_roji_comm_amount', true );
								$subtotal = (float) get_post_meta( $c->ID, '_roji_comm_subtotal', true );
								$kind     = (string) get_post_meta( $c->ID, '_roji_comm_kind', true );
								$order_id = (int) get_post_meta( $c->ID, '_roji_comm_order_id', true );
								$ord_url  = $order_id ? admin_url( 'post.php?post=' . $order_id . '&action=edit' ) : '#';
							?>
								<tr>
									<td><input type="checkbox" name="comm_ids[]" value="<?php echo esc_attr( $c->ID ); ?>" /></td>
									<td><?php echo esc_html( get_the_date( 'M j, Y', $c ) ); ?></td>
									<td><a href="<?php echo esc_url( $ord_url ); ?>">#<?php echo esc_html( $order_id ); ?></a></td>
									<td><?php echo esc_html( ucfirst( $kind ) ); ?></td>
									<td>$<?php echo esc_html( number_format( $subtotal, 2 ) ); ?></td>
									<td><?php echo esc_html( $pct ); ?>%</td>
									<td class="amt">$<?php echo esc_html( number_format( $amount, 2 ) ); ?></td>
								</tr>
							<?php endforeach; ?>
							</tbody>
						</table>
					</section>
				<?php endforeach; ?>

				<button type="submit" name="roji_aff_payout_action" value="mark_paid" class="button button-primary button-large">Mark selected as paid</button>
			</form>
		<?php endif; ?>

		<div class="roji-payout-recent">
			<header>Recently paid (last 20)</header>
			<?php if ( empty( $recently_paid ) ) : ?>
				<div style="padding:18px;color:#50575e;">No payouts on record yet.</div>
			<?php else : ?>
				<table>
					<thead>
						<tr><th>Paid on</th><th>Affiliate</th><th>Order</th><th>Amount</th><th>Reference</th></tr>
					</thead>
					<tbody>
					<?php foreach ( $recently_paid as $p ) :
						$amount  = (float) get_post_meta( $p->ID, '_roji_comm_amount', true );
						$ref     = (string) get_post_meta( $p->ID, '_roji_comm_paid_reference', true );
						$order_id= (int) get_post_meta( $p->ID, '_roji_comm_order_id', true );
						$aff_id  = (int) get_post_meta( $p->ID, '_roji_comm_affiliate_id', true );
						$aff     = get_post( $aff_id );
					?>
						<tr>
							<td><?php echo esc_html( get_the_modified_date( 'M j, Y', $p ) ); ?></td>
							<td><?php echo esc_html( $aff ? $aff->post_title : ( '#' . $aff_id ) ); ?></td>
							<td>#<?php echo esc_html( $order_id ); ?></td>
							<td style="font-family:monospace;font-weight:600;">$<?php echo esc_html( number_format( $amount, 2 ) ); ?></td>
							<td><?php echo esc_html( $ref ); ?></td>
						</tr>
					<?php endforeach; ?>
					</tbody>
				</table>
			<?php endif; ?>
		</div>
	</div>
	<?php
}

/* -----------------------------------------------------------------------------
 * Mark a list of commissions as paid + audit-log it
 * -------------------------------------------------------------------------- */

function roji_aff_mark_commissions_paid( $ids, $reference ) {
	$count = 0;
	$total = 0.0;
	$user  = wp_get_current_user();
	foreach ( $ids as $id ) {
		if ( get_post_type( $id ) !== ROJI_COMM_POST_TYPE ) {
			continue;
		}
		$current = get_post_meta( $id, '_roji_comm_status', true );
		if ( $current !== 'approved' ) {
			continue; // only approved commissions can transition to paid
		}
		$amount = (float) get_post_meta( $id, '_roji_comm_amount', true );
		update_post_meta( $id, '_roji_comm_status', 'paid' );
		update_post_meta( $id, '_roji_comm_paid_at', current_time( 'mysql' ) );
		update_post_meta( $id, '_roji_comm_paid_reference', $reference );
		update_post_meta( $id, '_roji_comm_paid_by', (int) $user->ID );

		// Bump affiliate lifetime commission counter.
		$aff_id = (int) get_post_meta( $id, '_roji_comm_affiliate_id', true );
		if ( $aff_id ) {
			$lifetime = (float) get_post_meta( $aff_id, '_roji_aff_lifetime_commission', true );
			update_post_meta( $aff_id, '_roji_aff_lifetime_commission', $lifetime + $amount );
		}
		$count++;
		$total += $amount;
	}
	if ( $count > 0 ) {
		// Email each affected affiliate.
		roji_aff_email_payouts( $ids, $reference );
	}
	return array( 'count' => $count, 'total' => $total );
}

/**
 * Send a "you've been paid" email per affiliate affected by this batch.
 */
function roji_aff_email_payouts( $comm_ids, $reference ) {
	$by_aff = array();
	foreach ( $comm_ids as $id ) {
		if ( get_post_type( $id ) !== ROJI_COMM_POST_TYPE ) {
			continue;
		}
		$status = get_post_meta( $id, '_roji_comm_status', true );
		if ( $status !== 'paid' ) {
			continue;
		}
		$aff_id = (int) get_post_meta( $id, '_roji_comm_affiliate_id', true );
		$amount = (float) get_post_meta( $id, '_roji_comm_amount', true );
		$by_aff[ $aff_id ]['total']  = ( $by_aff[ $aff_id ]['total'] ?? 0 ) + $amount;
		$by_aff[ $aff_id ]['count']  = ( $by_aff[ $aff_id ]['count'] ?? 0 ) + 1;
	}
	foreach ( $by_aff as $aff_id => $info ) {
		$email   = (string) get_post_meta( $aff_id, '_roji_aff_payout_email', true );
		if ( ! $email ) {
			$email = (string) get_post_meta( $aff_id, '_roji_aff_email', true );
		}
		if ( ! is_email( $email ) ) {
			continue;
		}
		$post  = get_post( $aff_id );
		$first = $post ? $post->post_title : '';
		$total = number_format( (float) $info['total'], 2 );
		$count = (int) $info['count'];
		$dash  = get_permalink( get_page_by_path( ROJI_AFF_DASH_SLUG ) );
		$subj  = sprintf( '[%s] Commission payout sent — $%s', ROJI_BRAND_NAME, $total );

		$html  = '<p style="margin:0 0 14px;">Hi ' . esc_html( $first ?: 'there' ) . ',</p>';
		$html .= '<p style="margin:0 0 14px;">We just paid out <strong>' . $count . '</strong> commission' . ( $count === 1 ? '' : 's' ) . ', totaling:</p>';
		$html .= '<div style="font-family:JetBrains Mono,monospace;font-size:28px;color:#4ade80;margin:0 0 18px;">$' . esc_html( $total ) . '</div>';
		if ( $reference !== '' ) {
			$html .= '<p style="margin:0 0 14px;color:#8a8a9a;font-size:13px;">Payment reference: <code style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;">' . esc_html( $reference ) . '</code></p>';
		}
		if ( $dash ) {
			$html .= '<p style="margin:18px 0;"><a href="' . esc_url( $dash ) . '" style="display:inline-block;background:#4f6df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">View commission details →</a></p>';
		}
		$html .= '<p style="margin:0;color:#c8c8d0;font-size:14px;">Thanks for sending people our way.</p>';

		if ( function_exists( 'roji_wp_mail_branded_html' ) ) {
			roji_wp_mail_branded_html( $email, $subj, 'Payout sent', $html );
		} elseif ( function_exists( 'roji_wp_mail_plain' ) ) {
			roji_wp_mail_plain( $email, $subj, wp_strip_all_tags( $html ) );
		} else {
			wp_mail( $email, $subj, wp_strip_all_tags( $html ) );
		}
	}
}

/* -----------------------------------------------------------------------------
 * CSV export — approved or paid commissions
 * -------------------------------------------------------------------------- */

function roji_aff_export_csv( $status_filter ) {
	if ( ! current_user_can( ROJI_AFF_PAYOUTS_CAP ) ) {
		wp_die( 'Forbidden.' );
	}
	$status_filter = in_array( $status_filter, array( 'approved', 'paid', 'pending' ), true ) ? $status_filter : 'approved';

	$rows = get_posts(
		array(
			'post_type'      => ROJI_COMM_POST_TYPE,
			'meta_key'       => '_roji_comm_status',
			'meta_value'     => $status_filter,
			'posts_per_page' => 5000,
			'orderby'        => 'date',
			'order'          => 'ASC',
		)
	);

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="roji-commissions-' . $status_filter . '-' . gmdate( 'Y-m-d' ) . '.csv"' );

	$out = fopen( 'php://output', 'w' );
	fputcsv( $out, array(
		'commission_id', 'created', 'status', 'kind',
		'affiliate_id', 'affiliate_name', 'affiliate_code', 'payout_email',
		'order_id', 'subtotal_usd', 'rate_pct', 'amount_usd',
		'paid_at', 'paid_reference',
	) );
	foreach ( $rows as $r ) {
		$aff_id = (int) get_post_meta( $r->ID, '_roji_comm_affiliate_id', true );
		$aff    = get_post( $aff_id );
		fputcsv( $out, array(
			$r->ID,
			get_the_date( 'Y-m-d', $r ),
			get_post_meta( $r->ID, '_roji_comm_status', true ),
			get_post_meta( $r->ID, '_roji_comm_kind', true ),
			$aff_id,
			$aff ? $aff->post_title : '',
			get_post_meta( $aff_id, '_roji_aff_code', true ),
			get_post_meta( $aff_id, '_roji_aff_payout_email', true ),
			get_post_meta( $r->ID, '_roji_comm_order_id', true ),
			number_format( (float) get_post_meta( $r->ID, '_roji_comm_subtotal', true ), 2, '.', '' ),
			get_post_meta( $r->ID, '_roji_comm_pct', true ),
			number_format( (float) get_post_meta( $r->ID, '_roji_comm_amount', true ), 2, '.', '' ),
			get_post_meta( $r->ID, '_roji_comm_paid_at', true ),
			get_post_meta( $r->ID, '_roji_comm_paid_reference', true ),
		) );
	}
	fclose( $out );
	exit;
}

/* -----------------------------------------------------------------------------
 * WP-CLI: wp roji aff:pay <comm_id>... --reference="..."
 * Same logic as the admin UI, scriptable.
 * -------------------------------------------------------------------------- */

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'roji aff:pay',
		function ( $args, $assoc ) {
			$ids = array_map( 'intval', $args );
			if ( empty( $ids ) ) {
				WP_CLI::error( 'Usage: wp roji aff:pay <commission_id>... [--reference="..."]' );
			}
			$ref    = sanitize_text_field( $assoc['reference'] ?? '' );
			$result = roji_aff_mark_commissions_paid( $ids, $ref );
			WP_CLI::success( sprintf( 'Marked %d commission(s) paid totalling $%s.', $result['count'], number_format( $result['total'], 2 ) ) );
		}
	);
}
