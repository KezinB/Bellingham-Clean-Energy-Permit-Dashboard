(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.DashboardCore = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function normalizeRecord(record, categoryOrder) {
        let timestamp = 0;
        if (record.date) {
            const dt = new Date(record.date + "T00:00:00");
            timestamp = Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
        }

        return {
            id: String(record.id || ""),
            category: categoryOrder.includes(record.category) ? record.category : "Solar",
            date: record.date || "",
            appliedDate: record.appliedDate || "",
            issuedDate: record.issuedDate || "",
            address: record.address || "Unknown address",
            description: record.description || "No description listed.",
            status: record.status || "Unknown",
            applicant: record.applicant || "Unknown",
            applicationType: record.applicationType || "",
            permitNumber: record.permitNumber || "",
            matchedTerms: Array.isArray(record.matchedTerms)
                ? record.matchedTerms
                : (record.matchedTerms ? [record.matchedTerms] : []),
            lat: typeof record.lat === "number" ? record.lat : null,
            lng: typeof record.lng === "number" ? record.lng : null,
            propertyType: record.propertyType || null,
            yearBuilt: record.yearBuilt || null,
            propertyValue: record.propertyValue || 0,
            isEjArea: false,
            ejCriteria: null,
            timestamp
        };
    }

    function filterRecords(records, state) {
        return records.filter((record) => {
            if (!state.categories.includes(record.category)) return false;
            if (state.selectedMonth && record.date.slice(0, 7) !== state.selectedMonth) return false;
            if (state.fromDate && record.date < state.fromDate) return false;
            if (state.toDate && record.date > state.toDate) return false;

            if (state.query) {
                const searchable = [
                    record.address,
                    record.description,
                    record.applicant,
                    record.permitNumber
                ].join(" ").toLowerCase();

                if (!searchable.includes(state.query)) return false;
            }

            return true;
        });
    }

    function sortRecords(items, sortMode) {
        return items.slice().sort((left, right) => {
            if (sortMode === "date-asc") return left.timestamp - right.timestamp;
            if (sortMode === "address-asc") return left.address.localeCompare(right.address);
            if (sortMode === "category-asc") return left.category.localeCompare(right.category);
            if (sortMode === "ej-desc") return (right.isEjArea - left.isEjArea) || (right.timestamp - left.timestamp);
            return right.timestamp - left.timestamp;
        });
    }

    function buildMonthlyBuckets(items) {
        const buckets = new Map();

        items.forEach((item) => {
            if (!item.date) return;
            const key = item.date.slice(0, 7);
            if (!buckets.has(key)) {
                const dt = new Date(key + "-01T00:00:00");
                buckets.set(key, {
                    key,
                    count: 0,
                    shortLabel: dt.toLocaleDateString("en-US", { month: "short" })
                });
            }
            buckets.get(key).count++;
        });

        return Array.from(buckets.values()).sort((left, right) => left.key.localeCompare(right.key));
    }

    function escapeCsvValue(value) {
        const normalized = String(value ?? "");
        return "\"" + normalized.replace(/"/g, "\"\"") + "\"";
    }

    function exportRecordsToCsv(items) {
        const headers = [
            "Date",
            "Category",
            "Address",
            "Applicant",
            "Description",
            "Status",
            "Permit Number",
            "Property Type",
            "Year Built",
            "Property Value",
            "EJ Area",
            "EJ Criteria",
            "Latitude",
            "Longitude"
        ];

        const rows = items.map((item) => [
            item.date,
            item.category,
            item.address,
            item.applicant,
            item.description,
            item.status,
            item.permitNumber,
            item.propertyType || "",
            item.yearBuilt || "",
            item.propertyValue || "",
            item.isEjArea ? "Yes" : "No",
            item.ejCriteria || "",
            item.lat ?? "",
            item.lng ?? ""
        ]);

        return [headers, ...rows]
            .map((row) => row.map(escapeCsvValue).join(","))
            .join("\r\n");
    }

    return {
        normalizeRecord,
        filterRecords,
        sortRecords,
        buildMonthlyBuckets,
        escapeCsvValue,
        exportRecordsToCsv
    };
});
