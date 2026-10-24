# homepage-visitors

Counts page visits per country for the homepage. Stores one integer per country
and nothing else, so there is no personal data at rest and nothing to disclose.

## Deploy

Needs a free Cloudflare account. From this directory:

    npx wrangler login      # opens a browser once, to authorise this machine
    npx wrangler deploy

`deploy` prints a URL like `https://homepage-visitors.<subdomain>.workers.dev`.
Put that URL in `ENDPOINT` at the top of `src/components/VisitorMap.astro`.

The site itself stays on GitHub Pages. No domain or nameserver moves to
Cloudflare; the Worker lives on its own `workers.dev` address.

## Response

    GET /  ->  { "total": 4218, "countries": { "FI": 982, ... }, "you": "FI" }

Each GET records one visit from the caller's country, then returns the totals.

## Cost

Workers free plan: 100,000 requests a day. SQLite Durable Objects are on the
free plan too, at 100,000 rows written a day, which is the write budget this
uses (one row per visit).
