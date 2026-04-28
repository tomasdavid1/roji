<?php
/**
 * Roji Child — lightweight age-verification modal.
 *
 * Self-contained fallback in case the Age Gate plugin is not installed.
 * Stores the answer in a 30-day cookie; "no" redirects off-site.
 *
 * @package roji-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Inject the modal markup + script into the footer on every front-end page.
 */
add_action(
	'wp_footer',
	function () {
		if ( is_admin() ) {
			return;
		}
		$age = (int) ROJI_AGE_REQUIREMENT;
		?>
<div id="roji-age-gate" style="display:none;position:fixed;inset:0;background:rgba(10,10,15,0.92);z-index:99999;backdrop-filter:blur(6px);align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:440px;width:90%;background:#16161f;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:32px;text-align:center;">
	<div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4f6df5;margin-bottom:16px;">Age Verification</div>
	<h2 style="color:#f0f0f5;font-size:22px;font-weight:600;letter-spacing:-0.02em;margin:0 0 12px;">Are you <?php echo esc_html( $age ); ?> or older?</h2>
	<p style="color:#8a8a9a;font-size:13px;line-height:1.6;margin:0 0 24px;">
	  This site sells research compounds for laboratory use only. You must
	  confirm you are at least <?php echo esc_html( $age ); ?> years of age to enter.
	</p>
	<div style="display:flex;gap:10px;justify-content:center;">
	  <button type="button" id="roji-age-no" style="flex:1;padding:12px;background:transparent;color:#8a8a9a;border:1px solid rgba(255,255,255,0.06);border-radius:8px;cursor:pointer;font-size:14px;">No, I am under <?php echo esc_html( $age ); ?></button>
	  <button type="button" id="roji-age-yes" style="flex:1;padding:12px;background:#4f6df5;color:#fff;border:0;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Yes, enter site</button>
	</div>
  </div>
</div>
<script>
(function(){
  function getCookie(name){
	var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
	return m ? decodeURIComponent(m[1]) : null;
  }
  function setCookie(name, value, days){
	var d = new Date();
	d.setTime(d.getTime() + days*24*60*60*1000);
	document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;samesite=lax';
  }
  if (getCookie('roji_age_ok') === '1') return;
  var gate = document.getElementById('roji-age-gate');
  if (!gate) return;
  gate.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('roji-age-yes').addEventListener('click', function(){
	setCookie('roji_age_ok', '1', 30);
	gate.style.display = 'none';
	document.body.style.overflow = '';
  });
  document.getElementById('roji-age-no').addEventListener('click', function(){
	window.location.href = 'https://www.google.com/';
  });
})();
</script>
		<?php
	},
	5
);
