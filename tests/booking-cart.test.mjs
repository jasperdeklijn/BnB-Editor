import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import { bookingCartDb } from "./helpers/booking-cart-db.mjs"

const require = createRequire(import.meta.url)
function load(file) {
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  Function(
    "module",
    "exports",
    "require",
    compiled,
  )(module, module.exports, (id) =>
    id.startsWith("@/") ? load(path.resolve(`${id.slice(2)}.ts`)) : require(id),
  )
  return module.exports
}
const cart = load("lib/booking/cart.ts"),
  types = load("lib/booking/types.ts")
const sid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const business = sid(100),
  website = sid(101),
  owner = sid(102),
  resource = sid(103)
const catalog = {
  enabled: true,
  combinable: true,
  vat_rate_basis_points: 0,
  variants: [
    { id: "base", name: "Basis", duration_minutes: 45, price_minor: 4500 },
  ],
  extras: [
    {
      id: "massage",
      name: "Massage",
      duration_minutes: 20,
      price_minor: 2000,
      variant_ids: [],
      exclusive_group: "",
    },
  ],
}
const services = [
  { id: sid(1), title: "Behandeling", booking_catalog: catalog },
  {
    id: sid(2),
    title: "Advies",
    booking_catalog: {
      ...catalog,
      variants: [
        {
          id: "base",
          name: "Standaard",
          duration_minutes: 30,
          price_minor: 3000,
        },
      ],
      extras: [],
    },
  },
]
const selection = [
  { service_id: sid(1), variant_id: "base", extra_ids: ["massage"] },
  { service_id: sid(2), variant_id: "base", extra_ids: [] },
]
const lines = cart.resolveCartLines(selection, services)
const settings = services.map((service) => ({
  ...types.createDefaultServiceBookingSettings(service.id, business),
  booking_enabled: true,
  minimum_notice_minutes: 0,
  booking_horizon_days: 730,
}))
const windows = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  service_id: null,
  weekday,
  start_time: "09:00",
  end_time: "17:00",
  timezone: "Europe/Amsterdam",
  is_active: true,
}))
const input = {
  lines,
  settings,
  windows,
  entries: [],
  resources: [],
  resourceWindows: [],
  exceptions: [],
  date_from: "2026-10-26",
  date_to: "2026-10-26",
  now: new Date("2026-10-19T08:00:00Z"),
}

test("options produce one 95-minute plan with server prices, sequential off-grid starts and VAT", () => {
  const plan = cart.getCartAvailability(input)[0]
  assert.equal(plan.duration_minutes, 95)
  assert.equal(plan.total_minor, 9500)
  assert.equal(plan.items[1].start_at, "2026-10-26T09:05:00.000Z")
  assert.equal(plan.end_at, "2026-10-26T09:35:00.000Z")
  assert.equal(
    cart.resolveCartLines(
      [selection[0]],
      [
        {
          ...services[0],
          booking_catalog: { ...catalog, vat_rate_basis_points: 2100 },
        },
      ],
    )[0].price_minor,
    7865,
  )
  assert.throws(() =>
    cart.resolveCartLines(
      [{ ...selection[0], extra_ids: ["unknown"] }],
      services,
    ),
  )
  assert.throws(() =>
    cart.resolveCartLines([selection[0], selection[0]], services),
  )
  assert.throws(() =>
    cart.resolveCartLines(selection, [
      { ...services[0], booking_catalog: { ...catalog, combinable: false } },
      services[1],
    ]),
  )
})
test("compatibility, exclusive extras, closures, different rosters and summed buffers are enforced", () => {
  const incompatible = {
    ...catalog,
    extras: [{ ...catalog.extras[0], variant_ids: ["other"] }],
  }
  assert.throws(() =>
    cart.resolveCartLines(
      [selection[0]],
      [{ ...services[0], booking_catalog: incompatible }],
    ),
  )
  assert.equal(
    cart.getCartAvailability({
      ...input,
      exceptions: [
        {
          service_id: null,
          resource_id: null,
          date: input.date_from,
          windows: [],
        },
      ],
    }).length,
    0,
  )
  const plan = cart.getCartAvailability({
    ...input,
    settings: settings.map((setting) => ({
      ...setting,
      buffer_before_minutes: 10,
      buffer_after_minutes: 15,
    })),
  })[0]
  assert.equal(plan.items[1].start_at, "2026-10-26T09:30:00.000Z")
  assert.equal(
    cart.buildCartPlan(
      {
        ...input,
        windows: [
          ...windows,
          {
            ...windows[0],
            service_id: sid(2),
            start_time: "12:00",
            end_time: "17:00",
          },
        ],
      },
      "2026-10-26T08:00:00Z",
    ),
    null,
  )
})
test("shared resources block different services and respect per-resource capacity", () => {
  const shared = {
    ...input,
    settings: settings.map((setting) => ({
      ...setting,
      resource_id: resource,
    })),
    resources: [
      { id: resource, business_id: business, name: "Mijn agenda", capacity: 1 },
    ],
    resourceWindows: windows.map((window) => ({
      ...window,
      resource_id: resource,
    })),
    entries: [
      {
        service_id: sid(2),
        entry_type: "appointment",
        status: "confirmed",
        start_at: "2026-10-26T08:00:00Z",
        end_at: "2026-10-26T09:00:00Z",
      },
    ],
  }
  assert.equal(cart.buildCartPlan(shared, "2026-10-26T08:00:00Z"), null)
  assert.ok(
    cart.buildCartPlan(
      { ...shared, resources: [{ ...shared.resources[0], capacity: 2 }] },
      "2026-10-26T08:00:00Z",
    ),
  )
  assert.ok(
    cart.buildCartPlan(
      { ...input, entries: shared.entries, lines: [lines[0]] },
      "2026-10-26T08:00:00Z",
    ),
  )
})

async function fixture() {
  const db = await bookingCartDb()
  await db.exec(
    `insert into auth.users values('${owner}','owner@example.test'); insert into public.businesses values('${business}','${owner}'); insert into public.subscriptions values('${owner}',true,'active',null);`,
  )
  for (const service of services)
    await db.query(
      "insert into public.services(id,business_id,title,booking_catalog) values($1,$2,$3,$4)",
      [service.id, business, service.title, service.booking_catalog],
    )
  await db.query("insert into public.websites values($1,$2,true,$3)", [
    website,
    owner,
    {
      publishedAt: "v1",
      services: services.map((service) => ({
        ...service,
        business_id: business,
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
  for (const setting of settings)
    await db.query(
      "insert into public.service_booking_settings(service_id,business_id,booking_enabled,minimum_notice_minutes,booking_horizon_days) values($1,$2,true,0,730)",
      [setting.service_id, business],
    )
  for (const window of windows)
    await db.query(
      "insert into public.calendar_availability_windows(business_id,weekday,start_time,end_time,timezone) values($1,$2,$3,$4,$5)",
      [
        business,
        window.weekday,
        window.start_time,
        window.end_time,
        window.timezone,
      ],
    )
  // Relative dates keep transactional tests valid beyond the current day.
  const day = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const plan = cart.getCartAvailability({
    ...input,
    date_from: day,
    date_to: day,
    now: new Date(),
  })[0]
  const create = async (customPlan = plan, token = crypto.randomUUID()) =>
    (
      await db.query(
        "select public.create_booking_cart_hold($1,$2,'section','v1',$3,$4,$5,$6) as result",
        [website, business, selection, customPlan, token, crypto.randomUUID()],
      )
    ).rows[0].result
  return { db, plan, create }
}
test("real migration creates all parts atomically, issues one financial record and replays confirmations", async () => {
  const { db, plan, create } = await fixture()
  try {
    const hold = await create(plan, "token")
    const customer = {
      name: "Test Customer",
      email: "customer@example.test",
      phone: "",
      message: "",
    }
    const confirm = () =>
      db.query(
        "select public.confirm_booking_cart($1,'token',$2,$3,'nl-NL','owner@example.test') as result",
        [hold.holdId, plan, customer],
      )
    const first = (await confirm()).rows[0].result
    const second = (await confirm()).rows[0].result
    assert.equal(first.groupId, second.groupId)
    assert.equal(
      (await db.query("select count(*)::int as n from calendar_entries"))
        .rows[0].n,
      2,
    )
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from booking_reservation_financials",
        )
      ).rows[0].n,
      1,
    )
    assert.equal(
      (
        await db.query(
          "select total_minor::int as n from booking_reservation_financials",
        )
      ).rows[0].n,
      9500,
    )
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from booking_notifications where recipient_type='customer'",
        )
      ).rows[0].n,
      1,
    )
    await db.query("select cancel_customer_booking($1)", [
      first.calendarEntryId,
    ])
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from calendar_entries where status='cancelled'",
        )
      ).rows[0].n,
      2,
    )
  } finally {
    await db.close()
  }
})
test("group rescheduling moves every part and rejects a conflict without partially moving", async () => {
  const { db, plan, create } = await fixture()
  try {
    const hold = await create(plan, "token")
    const booked = (
      await db.query(
        "select confirm_booking_cart($1,'token',$2,$3,'nl-NL','owner@example.test') as result",
        [
          hold.holdId,
          plan,
          { name: "Customer", email: "customer@example.test" },
        ],
      )
    ).rows[0].result
    await db.exec(`set role authenticated; set test.user_id='${owner}'`)
    const confirmed = (
      await db.query("select update_owned_booking_group($1,$2,'pending') as result", [
        booked.calendarEntryId,
        { status: "confirmed" },
      ])
    ).rows[0].result
    assert.equal(confirmed.status, "confirmed")
    assert.equal(
      (await db.query("select count(*)::int as n from calendar_entries where status='confirmed'")).rows[0].n,
      2,
    )
    await assert.rejects(
      db.query("select update_owned_booking_group($1,$2,'pending')", [
        booked.calendarEntryId,
        { status: "cancelled" },
      ]),
      /ondertussen gewijzigd/,
    )
    await db.exec("reset role")
    const shift = (time, hours) =>
      new Date(new Date(time).getTime() + hours * 3600000).toISOString()
    const request = (hours) =>
      db.query(
        "insert into booking_change_requests(calendar_entry_id,business_id,request_kind,requested_by,proposed_start_at,proposed_end_at) values($1,$2,'reschedule_request','customer',$3,$4) returning id",
        [
          booked.calendarEntryId,
          business,
          shift(plan.start_at, hours),
          shift(plan.end_at, hours),
        ],
      )
    const first = (await request(2)).rows[0].id
    await db.query("select apply_booking_group_change_request($1,'owner',$2)", [
      first,
      owner,
    ])
    const moved = (
      await db.query(
        "select id,start_at,end_at,booking_group_primary from calendar_entries order by start_at",
      )
    ).rows
    assert.equal(
      new Date(moved[1].start_at).toISOString(),
      shift(plan.items[1].start_at, 2),
    )
    await assert.rejects(
      db.query("update calendar_entries set status='cancelled' where id=$1", [
        moved[1].id,
      ]),
      /volledige boeking/,
    )
    await assert.rejects(
      db.query("delete from calendar_entries where id=$1", [moved[1].id]),
      /volledige boeking/,
    )
    await db.query(
      "insert into calendar_entries(business_id,service_id,entry_type,status,start_at,end_at) values($1,$2,'blocked','blocked',$3,$4)",
      [
        business,
        sid(2),
        shift(plan.items[1].start_at, 3),
        shift(plan.items[1].end_at, 3),
      ],
    )
    const conflicting = (await request(3)).rows[0].id
    await assert.rejects(
      db.query("select apply_booking_group_change_request($1,'owner',$2)", [
        conflicting,
        owner,
      ]),
      /BOOKING_SLOT_UNAVAILABLE/,
    )
    assert.equal(
      new Date(
        (
          await db.query("select start_at from calendar_entries where id=$1", [
            booked.calendarEntryId,
          ])
        ).rows[0].start_at,
      ).toISOString(),
      shift(plan.start_at, 2),
    )
    assert.equal(
      (
        await db.query(
          "select status from booking_change_requests where id=$1",
          [conflicting],
        )
      ).rows[0].status,
      "pending",
    )
  } finally {
    await db.close()
  }
})

test("planning snapshots, optimistic saves, owner RLS and private RPC grants hold", async () => {
  const { db } = await fixture()
  try {
    const other = sid(999)
    await db.query("insert into auth.users values($1,'other@example.test')", [
      other,
    ])
    await db.exec(`set role authenticated; set test.user_id='${owner}'`)
    const snapshot = (
      await db.query("select get_service_booking_planning($1) as result", [
        sid(1),
      ])
    ).rows[0].result
    assert.match(snapshot.revision, /^[a-f0-9]{32}$/)
    const config = {
      expectedRevision: snapshot.revision,
      catalog: null,
      useBusinessSchedule: false,
      windows: [{ weekday: 1, start_time: "09:00", end_time: "11:00" }],
      exceptions: [],
      resourceId: null,
      timezone: "Europe/Amsterdam",
    }
    await db.query("select save_service_booking_planning($1,$2)", [
      sid(1),
      config,
    ])
    await assert.rejects(
      db.query("select save_service_booking_planning($1,$2)", [sid(1), config]),
      /ondertussen gewijzigd/,
    )
    await assert.rejects(
      db.query(
        "select create_booking_cart_hold(null,null,'','',null,null,'',null)",
      ),
      /permission denied/,
    )
    await db.exec(`set test.user_id='${other}'`)
    assert.equal(
      (
        await db.query("select get_service_booking_planning($1) as result", [
          sid(1),
        ])
      ).rows[0].result,
      null,
    )
    assert.equal(
      (await db.query("select * from booking_groups")).rows.length,
      0,
    )
    await assert.rejects(
      db.query(
        "insert into booking_resources(business_id,name) values($1,'Foreign')",
        [business],
      ),
      /BOOKING_OWNER_REQUIRED|row-level security/,
    )
    await db.exec("set role anon")
    await assert.rejects(
      db.query("select * from booking_cart_holds"),
      /permission denied/,
    )
    await assert.rejects(
      db.query("select get_service_booking_planning(null)"),
      /permission denied/,
    )
  } finally {
    await db.close()
  }
})

test("reserved resources stay occupied when a service switches to another agenda", async () => {
  const { db, plan, create } = await fixture()
  try {
    const resourceB = sid(104)
    for (const id of [resource, resourceB])
      await db.query(
        "insert into booking_resources(id,business_id,name,windows) values($1,$2,'Agenda',$3)",
        [
          id,
          business,
          windows.map(({ weekday, start_time, end_time }) => ({
            weekday,
            start_time,
            end_time,
          })),
        ],
      )
    await db.query(
      "update service_booking_settings set resource_id=$1 where business_id=$2",
      [resource, business],
    )
    const sharedPlan = {
      ...plan,
      items: plan.items.map((item) => ({ ...item, resource_id: resource })),
    }
    const hold = await create(sharedPlan, "resource-token")
    await db.query(
      "select confirm_booking_cart($1,'resource-token',$2,$3,'nl-NL','owner@example.test')",
      [
        hold.holdId,
        sharedPlan,
        { name: "Customer", email: "customer@example.test" },
      ],
    )
    await db.query(
      "update service_booking_settings set resource_id=$1 where business_id=$2",
      [resourceB, business],
    )
    await db.query(
      "insert into services(id,business_id,title) values($1,$2,'Other service')",
      [sid(3), business],
    )
    await db.query(
      "insert into service_booking_settings(service_id,business_id,resource_id) values($1,$2,$3)",
      [sid(3), business, resource],
    )
    await assert.rejects(
      db.query(
        "insert into calendar_entries(business_id,service_id,status,start_at,end_at) values($1,$2,'confirmed',$3,$4)",
        [business, sid(3), plan.items[0].start_at, plan.items[0].end_at],
      ),
      /BOOKING_SLOT_UNAVAILABLE/,
    )
    assert.equal(
      (
        await db.query(
          "select count(*)::int as n from calendar_entries where booking_resource_id=$1",
          [resource],
        )
      ).rows[0].n,
      2,
    )
  } finally {
    await db.close()
  }
})

test("unavailable final item rolls back the whole hold and add-on expiry rejects confirmation", async () => {
  const { db, plan, create } = await fixture()
  try {
    await db.query(
      "insert into calendar_entries(business_id,service_id,start_at,end_at,status) values($1,$2,$3,$4,'confirmed')",
      [business, sid(2), plan.items[1].start_at, plan.items[1].end_at],
    )
    await assert.rejects(create(), /BOOKING_SLOT_UNAVAILABLE/)
    assert.equal(
      (await db.query("select count(*)::int as n from booking_cart_holds"))
        .rows[0].n,
      0,
    )
    assert.equal(
      (await db.query("select count(*)::int as n from booking_holds")).rows[0]
        .n,
      0,
    )
    await db.exec("delete from calendar_entries")
    const hold = await create(plan, "token")
    await db.exec("update subscriptions set booking_addon_active=false")
    await assert.rejects(
      db.query("select confirm_booking_cart($1,'token',$2,$3,'nl-NL','')", [
        hold.holdId,
        plan,
        { name: "Customer", email: "customer@example.test" },
      ]),
      /BOOKING_CONTEXT_UNAVAILABLE/,
    )
    assert.equal(
      (await db.query("select count(*)::int as n from booking_groups")).rows[0]
        .n,
      0,
    )
  } finally {
    await db.close()
  }
})
