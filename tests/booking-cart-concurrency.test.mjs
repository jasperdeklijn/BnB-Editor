import assert from "node:assert/strict"
import test from "node:test"
import { setupBookingCartDb } from "./helpers/booking-cart-db.mjs"

// Opt in only with a fresh, disposable PostgreSQL database. The regular suite uses PGlite.
test(
  "two PostgreSQL sessions serialize the last capacity and replay one confirmation",
  { skip: !process.env.BOOKING_TEST_DATABASE_URL, timeout: 30000 },
  async () => {
    const driver = await import(process.env.BOOKING_TEST_PG_MODULE || "pg")
    const Client = driver.Client ?? driver.default.Client
    const connectionString = process.env.BOOKING_TEST_DATABASE_URL
    const owner = "10000000-0000-4000-8000-000000000001",
      business = "10000000-0000-4000-8000-000000000002",
      website = "10000000-0000-4000-8000-000000000003"
    const serviceIds = [
      "10000000-0000-4000-8000-000000000004",
      "10000000-0000-4000-8000-000000000005",
    ]
    const a = new Client({ connectionString }),
      b = new Client({ connectionString }),
      observer = new Client({ connectionString })
    await Promise.all([a.connect(), b.connect(), observer.connect()])
    try {
      const tables = (
        await a.query(
          "select count(*)::int as n from information_schema.tables where table_schema in ('public','auth')",
        )
      ).rows[0].n
      assert.equal(
        tables,
        0,
        "Gebruik uitsluitend een lege, wegwerpbare PostgreSQL-testdatabase.",
      )
      await setupBookingCartDb({
        exec: (sql) => a.query(sql),
        query: (sql, values) => a.query(sql, values),
      })
      await a.query("insert into auth.users values($1,'owner@example.test');", [
        owner,
      ])
      await a.query("insert into businesses values($1,$2)", [business, owner])
      await a.query("insert into subscriptions values($1,true,'active',null)", [
        owner,
      ])
      const catalog = {
        enabled: true,
        combinable: true,
        vat_rate_basis_points: 0,
        variants: [
          {
            id: "base",
            name: "Basis",
            duration_minutes: 30,
            price_minor: 1000,
          },
        ],
        extras: [],
      }
      for (const id of serviceIds) {
        await a.query(
          "insert into services(id,business_id,title,booking_catalog) values($1,$2,'Dienst',$3)",
          [id, business, catalog],
        )
        await a.query(
          "insert into service_booking_settings(service_id,business_id,booking_enabled,timezone,minimum_notice_minutes,booking_horizon_days) values($1,$2,true,'UTC',0,730)",
          [id, business],
        )
      }
      for (let weekday = 1; weekday <= 7; weekday++)
        await a.query(
          "insert into calendar_availability_windows(business_id,weekday,start_time,end_time,timezone) values($1,$2,'00:00','23:59','UTC')",
          [business, weekday],
        )
      await a.query("insert into websites values($1,$2,true,$3)", [
        website,
        owner,
        {
          publishedAt: "v1",
          services: serviceIds.map((id) => ({
            id,
            business_id: business,
            booking_catalog: catalog,
          })),
          sections: [
            {
              id: "section",
              type: "services",
              data: {
                bookingSpaceEnabled: true,
                bookingSpaceMode: "calendar",
                bookingCartEnabled: true,
              },
            },
          ],
        },
      ])
      const date = new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10),
        start = `${date}T09:00:00.000Z`,
        middle = `${date}T09:30:00.000Z`,
        end = `${date}T10:00:00.000Z`
      const items = serviceIds.map((id, index) => ({
        service_id: id,
        title: "Dienst",
        variant_id: "base",
        extra_ids: [],
        description: "Dienst · Basis",
        duration_minutes: 30,
        price_minor: 1000,
        unit_price_minor: 1000,
        vat_rate_basis_points: 0,
        resource_id: null,
        start_at: index ? middle : start,
        end_at: index ? end : middle,
      }))
      const plan = {
        start_at: start,
        end_at: end,
        timezone: "UTC",
        confirmation_mode: "request",
        duration_minutes: 60,
        total_minor: 2000,
        subtotal_minor: 2000,
        vat_minor: 0,
        items,
        financial_lines: items.map((item) => ({
          id: item.service_id,
          description: item.description,
          quantity_milli: 1000,
          unit_price_minor: 1000,
          discount_minor: 0,
          vat_rate_basis_points: 0,
          subtotal_minor: 1000,
          vat_minor: 0,
          total_minor: 1000,
        })),
      }
      const selection = serviceIds.map((service_id) => ({
        service_id,
        variant_id: "base",
        extra_ids: [],
      }))
      const holdSql =
        "select create_booking_cart_hold($1,$2,'section','v1',$3,$4,$5,$6) as result"
      const holdArgs = (token) => [
        website,
        business,
        JSON.stringify(selection),
        plan,
        token,
        crypto.randomUUID(),
      ]
      const pid = (await b.query("select pg_backend_pid() as pid")).rows[0].pid
      const waitForBlocked = async () => {
        const deadline = Date.now() + 3000
        do {
          const row = (
            await observer.query(
              "select wait_event_type from pg_stat_activity where pid=$1",
              [pid],
            )
          ).rows[0]
          if (row?.wait_event_type === "Lock") return
          await new Promise((resolve) => setTimeout(resolve, 20))
        } while (Date.now() < deadline)
        assert.fail(
          "De tweede verbinding wachtte niet op de boekingsvergrendeling.",
        )
      }
      await a.query("begin")
      const held = (await a.query(holdSql, holdArgs("first-token"))).rows[0]
        .result
      const competing = b.query(holdSql, holdArgs("second-token")).then(
        (result) => ({ result }),
        (error) => ({ error }),
      )
      await waitForBlocked()
      await a.query("commit")
      assert.match(
        (await competing).error?.message ?? "",
        /BOOKING_SLOT_UNAVAILABLE/,
      )
      assert.equal(
        (await a.query("select count(*)::int as n from booking_cart_holds"))
          .rows[0].n,
        1,
      )
      const confirmSql =
          "select confirm_booking_cart($1,'first-token',$2,$3,'nl-NL','owner@example.test') as result",
        args = [
          held.holdId,
          plan,
          { name: "Customer", email: "customer@example.test" },
        ]
      await a.query("begin")
      const first = (await a.query(confirmSql, args)).rows[0].result
      const repeat = b.query(confirmSql, args)
      await waitForBlocked()
      await a.query("commit")
      const second = (await repeat).rows[0].result
      assert.equal(first.groupId, second.groupId)
      assert.equal(
        (await a.query("select count(*)::int as n from calendar_entries"))
          .rows[0].n,
        2,
      )
      assert.equal(
        (
          await a.query(
            "select count(*)::int as n from booking_reservation_financials",
          )
        ).rows[0].n,
        1,
      )
      assert.equal(
        (
          await a.query(
            "select count(*)::int as n from booking_notifications where recipient_type='customer'",
          )
        ).rows[0].n,
        1,
      )
    } finally {
      await a.query("rollback").catch(() => {})
      await Promise.all([a.end(), b.end(), observer.end()])
    }
  },
)
