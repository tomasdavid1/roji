# Privacy Policy Addendum — to paste into rojipeptides.com/privacy/

> **Status:** Draft, ready to paste into the existing Privacy Policy
> page at <https://rojipeptides.com/privacy/>. The current policy
> only covers `rojipeptides.com` and `protocol.rojipeptides.com`. We
> need to add coverage for `tools.rojipeptides.com` and
> `mcp.rojipeptides.com` before submitting the ChatGPT App.
>
> Why this matters:
>   - OpenAI's App Submission Guidelines require a published privacy
>     policy explaining categories of personal data collected,
>     purposes, recipients, and user controls.
>   - Reviewer #2 (Gemini) explicitly flagged: "If a user uploads a
>     PDF from a competing vendor to your ChatGPT widget, are you
>     parsing that locally in the browser, or is it hitting your
>     MCP server? If it hits your server, your Privacy Policy must
>     explicitly state how third-party vendor files are processed
>     and discarded, or OpenAI will reject the app on data privacy
>     grounds."
>   - We DO process COA text on the server (`coa-analyzer.ts` calls
>     `analyzeCoaText`), so we must disclose this.

## How to apply

1. Open <https://rojipeptides.com/wp-admin/post.php?post=PRIVACY_PAGE_ID&action=edit>
2. In the page body, **add a new section before the "Contact Us"
   section** with the content below.
3. Update the "Sites" definition near the top of the policy to
   include the two new subdomains.
4. Bump the policy's `dateModified` (Yoast does this automatically
   on save).

## Section 1 — update the "Sites" definition

Find the existing line that reads:

> ...when you visit rojipeptides.com and protocol.rojipeptides.com
> (collectively, the "Sites")...

Replace with:

> ...when you visit rojipeptides.com, protocol.rojipeptides.com,
> tools.rojipeptides.com, and mcp.rojipeptides.com (collectively,
> the "Sites" or "Services")...

## Section 2 — new section to add (paste verbatim)

```html
<h2>Research Tools (tools.rojipeptides.com)</h2>

<p>
  We operate a free suite of peptide research calculators and
  reference databases at <strong>tools.rojipeptides.com</strong>.
  These tools run primarily in your browser and do not require an
  account. The information you input (vial sizes, water volumes,
  target measurements, body composition inputs, supplement names,
  PubMed search queries) is processed only to compute the answer
  you requested and is not associated with any identifiable user
  profile.
</p>

<p>
  We use Google Analytics 4 and Google Ads conversion tracking
  on the tools site to measure tool engagement and (where you
  click through) referrals to our store. We do not sell or share
  this analytics data with third parties beyond Google's standard
  product terms. You can opt out of Google Analytics tracking
  using the <a href="https://tools.google.com/dlpage/gaoptout"
  rel="noopener" target="_blank">Google Analytics opt-out browser
  add-on</a>.
</p>

<h3>Certificate of Analysis (COA) verification</h3>

<p>
  When you paste the text content of a Certificate of Analysis
  (whether from Roji or a third-party vendor) into our COA
  Analyzer at tools.rojipeptides.com/coa or via the Roji ChatGPT
  App, we process that text on our server to compute a trust
  score, identify the testing lab, extract purity and mass-spec
  fields, and surface red flags. The text you paste is processed
  in memory only and is not persisted to any database, log, or
  third-party service. We retain transient request logs (timestamp
  + anonymized session identifier) for up to 7 days for abuse
  prevention; those logs do not contain the COA content. We do
  not redistribute, resell, or otherwise share the COA documents
  you submit.
</p>

<h2>Roji Research Tools — ChatGPT App and MCP server</h2>

<p>
  We operate a Model Context Protocol (MCP) server at
  <strong>mcp.rojipeptides.com</strong> that powers the Roji
  Research Tools ChatGPT App and may be used directly by other
  AI clients (Anthropic Claude, Cursor, etc.). When you invoke a
  Roji research tool from inside ChatGPT (or another MCP-compatible
  client), the following data flows through our MCP server:
</p>

<ul>
  <li>
    <strong>Tool inputs you provide:</strong> the values you
    specify for each calculator or lookup (e.g. vial size,
    compound name, COA text, PubMed query). We use these only to
    compute the requested answer and return it to you. They are
    not retained beyond the request.
  </li>
  <li>
    <strong>Anonymized session identifier:</strong> ChatGPT sends
    an anonymized conversation ID with each tool call. We use it
    only to correlate multi-step tool invocations within a single
    conversation (so we can attribute the second call in a thread
    to the same session as the first). It is not linked to any
    user profile, ChatGPT account, or external identity.
  </li>
  <li>
    <strong>Platform identifier:</strong> we record which client
    (ChatGPT, Claude, Cursor) called the tool so we can serve the
    correct widget format. We do not record any user information
    beyond the platform.
  </li>
  <li>
    <strong>Tool-call analytics:</strong> we keep an in-memory
    ring buffer of recent tool calls (tool name, anonymized
    session, duration, success/error) for operational debugging
    and product improvement. The buffer holds up to 10,000
    events and resets on every server deploy. It does not
    contain the tool inputs or outputs.
  </li>
</ul>

<p>
  We do <strong>not</strong> collect: your ChatGPT email address,
  your ChatGPT user ID, your IP address (other than what our
  hosting provider's standard request logs capture for security
  purposes and discard within 30 days), the contents of your
  ChatGPT conversation outside the tool call, or any other
  conversation history. We do <strong>not</strong> ask for your
  ChatGPT account credentials and we do <strong>not</strong>
  require you to log in to use any of our tools.
</p>

<p>
  When you click an external link from a tool result (for
  example, a research-grade product page on rojipeptides.com),
  the target site's own privacy policy applies to your visit
  there. We attach a <code>?utm_source=mcp</code> query string
  to those links so we can attribute traffic; this attribution
  is anonymous.
</p>

<h3>Third-party services we rely on</h3>

<ul>
  <li>
    <strong>NCBI / PubMed:</strong> when you use the PubMed
    search tool, your search query is sent to the public
    NCBI/PubMed E-utilities API to retrieve matching citations.
    We do not transmit any other information.
  </li>
  <li>
    <strong>Fly.io:</strong> our MCP server is hosted on Fly.io,
    which receives standard HTTP request metadata for the
    purpose of routing and security. See
    <a href="https://fly.io/legal/privacy-policy/" rel="noopener"
    target="_blank">Fly.io's privacy policy</a>.
  </li>
  <li>
    <strong>OpenAI / Anthropic:</strong> when you use Roji
    Research Tools through the ChatGPT App or via Claude, those
    platforms process your conversation per their own terms.
    Roji has no access to your ChatGPT or Claude conversation
    history beyond what you explicitly send to one of our tools.
  </li>
</ul>

<h3>Your rights</h3>

<p>
  Because the research tools and MCP server do not collect
  account data, the most actionable user controls are:
</p>

<ul>
  <li>
    <strong>Stop using the tools:</strong> closing the browser
    tab or removing the Roji Research Tools connector from your
    ChatGPT settings ends all data flow.
  </li>
  <li>
    <strong>Disable analytics:</strong> the Google Analytics
    opt-out described above also covers the tools subdomain.
  </li>
  <li>
    <strong>Request log deletion:</strong> if you want us to
    purge the transient request logs that contain your
    anonymized session identifier, email
    <a href="mailto:support@rojipeptides.com">support@rojipeptides.com</a>
    with the approximate timestamp window. We will delete the
    matching log entries within 30 days.
  </li>
</ul>
```

## Section 3 — verification checklist after pasting

- [ ] Visit <https://rojipeptides.com/privacy/> and confirm the new
      sections render correctly (Yoast schema should re-emit on save)
- [ ] Update the "Sites" definition near the top of the policy to
      include the two new subdomains
- [ ] Run a sitemap ping after the save (Yoast does this
      automatically on most installs)
- [ ] Test that the privacy policy URL returns HTTP 200 from a
      cold cache: `curl -I https://rojipeptides.com/privacy/`
- [ ] Note the timestamp of the update — we'll need to reference
      this in the OpenAI App submission form ("Privacy policy URL"
      field)
