const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../js/app-core.js");

const CATEGORY_ORDER = ["Solar", "EV Charger", "Heat Pump"];

function makeRecord(overrides = {}) {
    return {
        id: "1",
        category: "Solar",
        date: "2026-05-12",
        appliedDate: "2026-05-05",
        issuedDate: "2026-05-12",
        address: "9 Brookfield Ln",
        description: "roof mounted solar with battery",
        status: "Permit Issued",
        applicant: "Sunrun",
        applicationType: "SOLAR",
        permitNumber: "S-26-0037",
        matchedTerms: ["solar"],
        lat: 42.03,
        lng: -71.45,
        propertyType: "Single Family Residential",
        yearBuilt: 2015,
        propertyValue: 956800,
        ...overrides
    };
}

test("normalizeRecord preserves valid fields and creates timestamp", () => {
    const normalized = core.normalizeRecord(makeRecord(), CATEGORY_ORDER);

    assert.equal(normalized.category, "Solar");
    assert.equal(normalized.timestamp > 0, true);
    assert.deepEqual(normalized.matchedTerms, ["solar"]);
    assert.equal(normalized.isEjArea, false);
});

test("normalizeRecord falls back for invalid category and scalar matchedTerms", () => {
    const normalized = core.normalizeRecord(makeRecord({
        category: "Unknown",
        matchedTerms: "tesla",
        lat: "42.0"
    }), CATEGORY_ORDER);

    assert.equal(normalized.category, "Solar");
    assert.deepEqual(normalized.matchedTerms, ["tesla"]);
    assert.equal(normalized.lat, null);
});

test("filterRecords applies category, month, date, and text filters", () => {
    const records = [
        core.normalizeRecord(makeRecord({
            id: "1",
            category: "Solar",
            date: "2026-05-12",
            description: "solar install"
        }), CATEGORY_ORDER),
        core.normalizeRecord(makeRecord({
            id: "2",
            category: "Heat Pump",
            date: "2026-04-10",
            description: "ductless mini split"
        }), CATEGORY_ORDER)
    ];

    const filtered = core.filterRecords(records, {
        categories: ["Heat Pump"],
        selectedMonth: "2026-04",
        fromDate: "2026-04-01",
        toDate: "2026-04-30",
        query: "ductless"
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "2");
});

test("sortRecords supports ej-desc and address ordering", () => {
    const a = core.normalizeRecord(makeRecord({ id: "1", address: "B Ave", date: "2026-05-01" }), CATEGORY_ORDER);
    const b = core.normalizeRecord(makeRecord({ id: "2", address: "A Ave", date: "2026-05-02" }), CATEGORY_ORDER);
    b.isEjArea = true;

    const ejSorted = core.sortRecords([a, b], "ej-desc");
    assert.equal(ejSorted[0].id, "2");

    const addressSorted = core.sortRecords([a, b], "address-asc");
    assert.equal(addressSorted[0].id, "2");
});

test("buildMonthlyBuckets aggregates counts by yyyy-mm", () => {
    const items = [
        core.normalizeRecord(makeRecord({ id: "1", date: "2026-03-01" }), CATEGORY_ORDER),
        core.normalizeRecord(makeRecord({ id: "2", date: "2026-03-12" }), CATEGORY_ORDER),
        core.normalizeRecord(makeRecord({ id: "3", date: "2026-04-05" }), CATEGORY_ORDER)
    ];

    const buckets = core.buildMonthlyBuckets(items);

    assert.deepEqual(
        buckets.map((bucket) => ({ key: bucket.key, count: bucket.count })),
        [
            { key: "2026-03", count: 2 },
            { key: "2026-04", count: 1 }
        ]
    );
});

test("exportRecordsToCsv escapes quotes and includes header row", () => {
    const csv = core.exportRecordsToCsv([
        core.normalizeRecord(makeRecord({
            description: "quoted \"value\"",
            applicant: "Ryan, Inc."
        }), CATEGORY_ORDER)
    ]);

    assert.match(csv, /^"Date","Category","Address"/);
    assert.match(csv, /"quoted ""value"""/);
    assert.match(csv, /"Ryan, Inc\."/);
});
