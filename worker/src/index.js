// Visitor counter for ryenhails.github.io.
//
// It stores one integer per country and nothing else: no address, no cookie,
// no session, no per-visit row. Cloudflare already attaches the country to the
// request, so the address is read and dropped inside the edge, never persisted.

import { DurableObject } from "cloudflare:workers";

export class Visitors extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS hits (country TEXT PRIMARY KEY, n INTEGER NOT NULL)"
    );
  }

  record(country) {
    if (country) {
      this.ctx.storage.sql.exec(
        "INSERT INTO hits (country, n) VALUES (?, 1) " +
          "ON CONFLICT(country) DO UPDATE SET n = n + 1",
        country
      );
    }
    const countries = {};
    let total = 0;
    for (const row of this.ctx.storage.sql.exec("SELECT country, n FROM hits")) {
      countries[row.country] = row.n;
      total += row.n;
    }
    return { total, countries };
  }
}

const ALLOWED = [
  "https://ryenhails.github.io",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

const ISO2 = /^[A-Z]{2}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = {
      "access-control-allow-origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      "cache-control": "no-store",
      vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers });
    }

    // "T1" is Tor and "XX" is unknown; neither is a place, so neither is counted
    let country = request.cf?.country || request.headers.get("CF-IPCountry") || "";
    if (!ISO2.test(country) || country === "XX") country = "";

    const stub = env.VISITORS.get(env.VISITORS.idFromName("global"));
    const data = await stub.record(country);

    return Response.json({ ...data, you: country || null }, { headers });
  },
};
