import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "..");
const datasetPath = path.join(rootDir, "data", "permit_data.json");

const raw = fs.readFileSync(datasetPath, "utf8").replace(/^\uFEFF/, "");
const dataset = JSON.parse(raw);

const errors = [];

if (!dataset.meta || typeof dataset.meta !== "object") {
    errors.push("Missing top-level meta object.");
}

if (!Array.isArray(dataset.records)) {
    errors.push("Missing top-level records array.");
}

const records = Array.isArray(dataset.records) ? dataset.records : [];

records.forEach((record, index) => {
    const label = `records[${index}]`;
    if (!record.id) errors.push(`${label}: missing id`);
    if (!record.category) errors.push(`${label}: missing category`);
    if (!record.address) errors.push(`${label}: missing address`);
    if (record.date && !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        errors.push(`${label}: invalid date format ${record.date}`);
    }
    if (record.lat !== null && record.lat !== undefined && typeof record.lat !== "number") {
        errors.push(`${label}: lat must be a number when present`);
    }
    if (record.lng !== null && record.lng !== undefined && typeof record.lng !== "number") {
        errors.push(`${label}: lng must be a number when present`);
    }
});

if (dataset.meta && typeof dataset.meta.totalRecords === "number" && dataset.meta.totalRecords !== records.length) {
    errors.push(`meta.totalRecords (${dataset.meta.totalRecords}) does not match records.length (${records.length})`);
}

if (errors.length) {
    console.error("Dataset validation failed:");
    errors.slice(0, 50).forEach((error) => console.error("- " + error));
    if (errors.length > 50) {
        console.error(`- ...and ${errors.length - 50} more issues`);
    }
    process.exit(1);
}

console.log(`Dataset validation passed for ${records.length} records.`);
