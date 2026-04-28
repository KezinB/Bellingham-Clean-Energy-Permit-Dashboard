(function () {
    const CATEGORY_ORDER = ["Solar", "EV Charger", "Heat Pump"];
    const CATEGORY_CLASS = {
        Solar: "solar",
        "EV Charger": "ev",
        "Heat Pump": "hp"
    };
    const CATEGORY_COLORS = {
        Solar: "#f59e0b",
        "EV Charger": "#0ea5e9",
        "Heat Pump": "#ec4899"
    };
    const MAP_CENTER = [42.0862, -71.4737];
    const MAP_HOME_ZOOM = 13;
    const DEFAULT_TABLE_LIMIT = 5;

    const dataset = window.PERMIT_DATA;
    const statusBanner = document.getElementById("statusBanner");
    const totalCount = document.getElementById("total-count");
    const solarCount = document.getElementById("solar-count");
    const evCount = document.getElementById("ev-count");
    const hpCount = document.getElementById("hp-count");
    const monthCount = document.getElementById("month-count");
    const yearCount = document.getElementById("year-count");
    const latestDate = document.getElementById("latest-date");
    const avgMonthlyCount = document.getElementById("avg-monthly-count");
    const updatedPill = document.getElementById("updated-pill");
    const coveragePill = document.getElementById("coverage-pill");
    const methodNote = document.getElementById("methodNote");
    const geocodeCount = document.getElementById("geocodeCount");
    const visibleMapCount = document.getElementById("visibleMapCount");
    const distributionBars = document.getElementById("distributionBars");
    const trendChart = document.getElementById("trendChart");
    const trendNote = document.getElementById("trendNote");
    const resultsSummary = document.getElementById("resultsSummary");
    const tableNote = document.getElementById("tableNote");
    const tableBody = document.querySelector("#permitTable tbody");
    const recordLimitInput = document.getElementById("recordLimit");
    const searchInput = document.getElementById("permitSearch");
    const filterGroup = document.getElementById("categoryFilters");
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const sortRecordsInput = document.getElementById("sortRecords");
    const exportCsvButton = document.getElementById("exportCsv");
    const resetFiltersButton = document.getElementById("resetFilters");
    const detailCard = document.getElementById("recordDetailCard");
    const closeDetailButton = document.getElementById("closeDetail");

    if (!dataset || !Array.isArray(dataset.records)) {
        showStatus("Permit data is unavailable. Run scripts/build_permit_dataset.ps1 to regenerate the embedded snapshot.");
        return;
    }

    const records = dataset.records
        .map(normalizeRecord)
        .sort((left, right) => right.timestamp - left.timestamp);

    const latestRecordTimestamp = records.length ? records[0].timestamp : 0;
    const latestRecordDate = latestRecordTimestamp ? new Date(latestRecordTimestamp) : null;

    const state = {
        category: "All",
        query: "",
        fromDate: "",
        toDate: "",
        sort: "date-desc",
        tableLimit: DEFAULT_TABLE_LIMIT,
        selectedRecordId: null
    };

    const map = createMap();
    renderStaticMeta(records);
    wireControls();
    render();

    function normalizeRecord(record) {
        const timestamp = record.date ? Date.parse(record.date) || 0 : 0;
        return {
            id: String(record.id || ""),
            category: CATEGORY_ORDER.includes(record.category) ? record.category : "Solar",
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
                : record.matchedTerms
                    ? [record.matchedTerms]
                    : [],
            lat: typeof record.lat === "number" ? record.lat : null,
            lng: typeof record.lng === "number" ? record.lng : null,
            timestamp
        };
    }

    function wireControls() {
        filterGroup.addEventListener("click", function (event) {
            const button = event.target.closest("[data-category]");
            if (!button) {
                return;
            }

            state.category = button.getAttribute("data-category") || "All";
            for (const chip of filterGroup.querySelectorAll(".filter-chip")) {
                chip.classList.toggle("active", chip === button);
            }
            render();
        });

        searchInput.addEventListener("input", function () {
            state.query = searchInput.value.trim().toLowerCase();
            render();
        });

        fromDateInput.addEventListener("change", function () {
            state.fromDate = fromDateInput.value;
            render();
        });

        toDateInput.addEventListener("change", function () {
            state.toDate = toDateInput.value;
            render();
        });

        sortRecordsInput.addEventListener("change", function () {
            state.sort = sortRecordsInput.value;
            render();
        });

        recordLimitInput.addEventListener("change", function () {
            state.tableLimit = Number(recordLimitInput.value) || DEFAULT_TABLE_LIMIT;
            render();
        });

        exportCsvButton.addEventListener("click", function () {
            exportCsv(getFilteredRecords());
        });

        resetFiltersButton.addEventListener("click", function () {
            state.category = "All";
            state.query = "";
            state.fromDate = "";
            state.toDate = "";
            state.sort = "date-desc";
            state.tableLimit = DEFAULT_TABLE_LIMIT;
            state.selectedRecordId = null;

            searchInput.value = "";
            fromDateInput.value = "";
            toDateInput.value = "";
            sortRecordsInput.value = "date-desc";
            recordLimitInput.value = String(DEFAULT_TABLE_LIMIT);

            for (const chip of filterGroup.querySelectorAll(".filter-chip")) {
                chip.classList.toggle("active", chip.dataset.category === "All");
            }

            hideDetail();
            render();
        });

        closeDetailButton.addEventListener("click", hideDetail);
    }

    function renderStaticMeta(allRecords) {
        const meta = dataset.meta || {};
        updatedPill.textContent = "Updated: " + formatTimestamp(meta.generatedAt);
        coveragePill.textContent = "Map coverage: " + (meta.geocodedRecords || 0) + " / " + allRecords.length + " permits";
        methodNote.textContent = "";
        geocodeCount.textContent = String(meta.geocodedRecords || 0);

        totalCount.textContent = formatNumber(allRecords.length);
        solarCount.textContent = formatNumber(countByCategory(allRecords, "Solar"));
        evCount.textContent = formatNumber(countByCategory(allRecords, "EV Charger"));
        hpCount.textContent = formatNumber(countByCategory(allRecords, "Heat Pump"));

        monthCount.textContent = formatNumber(countInCurrentMonth(allRecords));
        yearCount.textContent = formatNumber(countInCurrentYear(allRecords));
        latestDate.textContent = latestRecordDate ? formatDate(toIsoDate(latestRecordDate)) : "-";
        avgMonthlyCount.textContent = formatOneDecimal(getAverageMonthlyCount(allRecords));

        initializeDateRange(allRecords);
        renderDistribution(allRecords);
        renderTrend(allRecords);
    }

    function initializeDateRange(allRecords) {
        const datedRecords = allRecords.filter((record) => record.timestamp);
        if (!datedRecords.length) {
            return;
        }

        const oldest = datedRecords[datedRecords.length - 1];
        const newest = datedRecords[0];
        fromDateInput.min = oldest.date;
        fromDateInput.max = newest.date;
        toDateInput.min = oldest.date;
        toDateInput.max = newest.date;
    }

    function renderDistribution(allRecords) {
        distributionBars.innerHTML = "";
        const maxCount = Math.max(1, ...CATEGORY_ORDER.map((category) => countByCategory(allRecords, category)));

        for (const category of CATEGORY_ORDER) {
            const count = countByCategory(allRecords, category);
            const row = document.createElement("div");
            row.className = "bar-row";

            const labels = document.createElement("div");
            labels.className = "bar-labels";

            const label = document.createElement("span");
            label.textContent = category;
            const value = document.createElement("span");
            value.textContent = formatNumber(count);
            labels.append(label, value);

            const track = document.createElement("div");
            track.className = "bar-track";
            const fill = document.createElement("div");
            fill.className = "bar-fill " + CATEGORY_CLASS[category];
            fill.style.width = String((count / maxCount) * 100) + "%";
            track.appendChild(fill);

            row.append(labels, track);
            distributionBars.appendChild(row);
        }
    }

    function renderTrend(allRecords) {
        trendChart.innerHTML = "";
        const monthlyBuckets = buildMonthlyBuckets(allRecords);

        if (!monthlyBuckets.length) {
            trendNote.textContent = "No dated permits available.";
            return;
        }

        const maxCount = Math.max(...monthlyBuckets.map((bucket) => bucket.count), 1);
        const recentBuckets = monthlyBuckets.slice(-12);
        trendNote.textContent = "Showing the latest " + recentBuckets.length + " months in the source snapshot.";

        for (const bucket of recentBuckets) {
            const item = document.createElement("div");
            item.className = "trend-item";

            const bar = document.createElement("div");
            bar.className = "trend-bar";
            bar.style.height = String(Math.max((bucket.count / maxCount) * 100, bucket.count ? 8 : 2)) + "%";

            const count = document.createElement("span");
            count.className = "trend-count";
            count.textContent = formatNumber(bucket.count);

            const label = document.createElement("span");
            label.className = "trend-label";
            label.textContent = bucket.shortLabel;

            item.append(count, bar, label);
            trendChart.appendChild(item);
        }
    }

    function render() {
        const filtered = sortRecords(getFilteredRecords());
        const geocodedFiltered = filtered.filter((record) => record.lat !== null && record.lng !== null);

        resultsSummary.textContent =
            formatNumber(filtered.length) +
            " permits match the current view. " +
            formatNumber(geocodedFiltered.length) +
            " of them have usable map coordinates.";

        visibleMapCount.textContent = formatNumber(geocodedFiltered.length);
        tableNote.textContent = "";

        renderTable(filtered.slice(0, state.tableLimit));
        renderMap(geocodedFiltered);
        syncSelectedRecord(filtered);
    }

    function getFilteredRecords() {
        return records.filter(function (record) {
            const categoryMatch = state.category === "All" || record.category === state.category;
            if (!categoryMatch) {
                return false;
            }

            if (state.fromDate && record.date && record.date < state.fromDate) {
                return false;
            }

            if (state.toDate && record.date && record.date > state.toDate) {
                return false;
            }

            if (!state.query) {
                return true;
            }

            const searchable = [
                record.address,
                record.description,
                record.status,
                record.applicant,
                record.permitNumber,
                record.applicationType
            ].join(" ").toLowerCase();

            return searchable.includes(state.query);
        });
    }

    function sortRecords(items) {
        const sorted = items.slice();

        sorted.sort(function (left, right) {
            switch (state.sort) {
                case "date-asc":
                    return compareNumbers(left.timestamp, right.timestamp) || compareText(left.address, right.address);
                case "address-asc":
                    return compareText(left.address, right.address) || compareNumbers(right.timestamp, left.timestamp);
                case "category-asc":
                    return compareText(left.category, right.category) || compareNumbers(right.timestamp, left.timestamp);
                case "status-asc":
                    return compareText(left.status, right.status) || compareNumbers(right.timestamp, left.timestamp);
                case "date-desc":
                default:
                    return compareNumbers(right.timestamp, left.timestamp) || compareText(left.address, right.address);
            }
        });

        return sorted;
    }

    function renderTable(items) {
        tableBody.innerHTML = "";

        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No permits match the current filters.";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        for (const item of items) {
            const row = document.createElement("tr");
            row.className = item.id === state.selectedRecordId ? "is-selected" : "";
            row.appendChild(makeCell(formatDate(item.date)));
            row.appendChild(makeCategoryCell(item.category));
            row.appendChild(makeCell(item.address));
            row.appendChild(makeCell(item.description));
            row.appendChild(makeStatusCell(item.status));
            row.appendChild(makeDetailButtonCell(item));
            tableBody.appendChild(row);
        }
    }

    function renderMap(items) {
        if (!map) {
            return;
        }

        map.layer.clearLayers();

        if (!items.length) {
            clearFocusArea();
            if (map.boundaryLayer) {
                map.instance.fitBounds(map.boundaryLayer.getBounds().pad(-0.05), { padding: [10, 10] });
            } else {
                map.instance.setView(MAP_CENTER, MAP_HOME_ZOOM);
            }
            return;
        }

        const bounds = [];

        for (const item of items) {
            const marker = L.circleMarker([item.lat, item.lng], {
                radius: 4,
                color: CATEGORY_COLORS[item.category],
                weight: 1,
                fillColor: CATEGORY_COLORS[item.category],
                fillOpacity: 0.66
            });

            marker.bindPopup(buildPopupMarkup(item));
            marker.on("click", function () {
                showDetail(item);
            });
            marker.addTo(map.layer);
            bounds.push([item.lat, item.lng]);
        }

        if (bounds.length === 1) {
            drawFocusArea(L.latLngBounds(bounds));
            map.instance.setView(bounds[0], 15);
        } else {
            const fittedBounds = L.latLngBounds(bounds);
            drawFocusArea(fittedBounds);
            map.instance.fitBounds(fittedBounds, { padding: [30, 30] });
        }
    }

    function createMap() {
        if (!window.L) {
            showStatus("Leaflet failed to load, so the map view is unavailable.");
            return null;
        }

        const instance = L.map("permitMap", {
            scrollWheelZoom: false
        }).setView(MAP_CENTER, MAP_HOME_ZOOM);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20
        }).addTo(instance);

        // Render Bellingham boundary
        let boundaryLayer = null;
        if (window.BELLINGHAM_BOUNDARY) {
            boundaryLayer = L.geoJSON(window.BELLINGHAM_BOUNDARY, {
                style: {
                    color: "#6366f1",
                    weight: 2.5,
                    opacity: 0.6,
                    fillColor: "#6366f1",
                    fillOpacity: 0.03,
                    dashArray: "6, 6"
                }
            }).addTo(instance);

            // Fit map to boundary on startup
            instance.fitBounds(boundaryLayer.getBounds().pad(-0.05), { padding: [10, 10] });
        }

        const layer = L.layerGroup().addTo(instance);
        const focusLayer = L.layerGroup().addTo(instance);
        addHomeControl(instance, boundaryLayer);
        addLegend(instance);

        return { instance, layer, focusLayer, boundaryLayer };
    }

    function drawFocusArea(bounds) {
        // Disabled focus area border as requested
    }

    function clearFocusArea() {
        if (map && map.focusLayer) {
            map.focusLayer.clearLayers();
        }
    }

    function addHomeControl(instance, boundaryLayer) {
        const HomeControl = L.Control.extend({
            options: {
                position: "topleft"
            },
            onAdd: function () {
                const container = L.DomUtil.create("button", "map-home-button");
                container.type = "button";
                container.title = "Reset to home view";
                container.setAttribute("aria-label", "Reset to home view");
                container.textContent = "Home";

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(container, "click", function () {
                    if (boundaryLayer) {
                        instance.fitBounds(boundaryLayer.getBounds().pad(-0.05), { padding: [10, 10] });
                    } else {
                        instance.setView(MAP_CENTER, MAP_HOME_ZOOM);
                    }
                });

                return container;
            }
        });

        instance.addControl(new HomeControl());
    }

    function addLegend(instance) {
        const LegendControl = L.Control.extend({
            options: {
                position: "bottomleft"
            },
            onAdd: function () {
                const div = L.DomUtil.create("div", "map-legend");
                div.innerHTML = `
                    <div class="map-legend-title">Categories</div>
                    <div class="legend-item"><span class="legend-color solar"></span>Solar</div>
                    <div class="legend-item"><span class="legend-color ev"></span>EV Charger</div>
                    <div class="legend-item"><span class="legend-color hp"></span>Heat Pump</div>
                `;
                return div;
            }
        });

        instance.addControl(new LegendControl());
    }

    function buildPopupMarkup(item) {
        const categoryClass = CATEGORY_CLASS[item.category];
        const terms = item.matchedTerms.length ? item.matchedTerms.join(", ") : "Not listed";
        return (
            '<div class="popup-card">' +
            '<h3 class="popup-title">' + escapeHtml(item.address) + "</h3>" +
            '<p class="popup-copy"><strong>Date:</strong> ' + escapeHtml(formatDate(item.date)) + "</p>" +
            '<p class="popup-copy"><strong>Description:</strong> ' + escapeHtml(item.description) + "</p>" +
            '<p class="popup-copy"><strong>Status:</strong> ' + escapeHtml(item.status) + "</p>" +
            '<p class="popup-copy"><strong>Matched terms:</strong> ' + escapeHtml(terms) + "</p>" +
            '<span class="popup-badge ' + categoryClass + '">' + escapeHtml(item.category) + "</span>" +
            "</div>"
        );
    }

    function makeCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    function makeCategoryCell(category) {
        const cell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "table-badge " + CATEGORY_CLASS[category];
        badge.textContent = category;
        cell.appendChild(badge);
        return cell;
    }

    function makeStatusCell(status) {
        const cell = document.createElement("td");
        cell.className = "status-text";
        cell.textContent = status;
        return cell;
    }

    function makeDetailButtonCell(item) {
        const cell = document.createElement("td");
        const button = document.createElement("button");
        button.className = "action-button compact";
        button.type = "button";
        button.textContent = "View";
        button.addEventListener("click", function () {
            showDetail(item);
        });
        cell.appendChild(button);
        return cell;
    }

    function showDetail(item) {
        state.selectedRecordId = item.id;
        detailCard.classList.remove("hidden");
        document.getElementById("detailTitle").textContent = item.address;
        document.getElementById("detailCategory").textContent = item.category;
        document.getElementById("detailDate").textContent = formatDate(item.date);
        document.getElementById("detailStatus").textContent = item.status;
        document.getElementById("detailPermitNumber").textContent = item.permitNumber || "-";
        document.getElementById("detailAddress").textContent = item.address;
        document.getElementById("detailApplicant").textContent = item.applicant;
        document.getElementById("detailDescription").textContent = item.description;
        document.getElementById("detailTerms").textContent = item.matchedTerms.length ? item.matchedTerms.join(", ") : "-";
        renderTable(sortRecords(getFilteredRecords()).slice(0, state.tableLimit));
    }

    function hideDetail() {
        state.selectedRecordId = null;
        detailCard.classList.add("hidden");
        renderTable(sortRecords(getFilteredRecords()).slice(0, state.tableLimit));
    }

    function syncSelectedRecord(filteredItems) {
        if (!state.selectedRecordId) {
            return;
        }

        const match = filteredItems.find((item) => item.id === state.selectedRecordId);
        if (!match) {
            hideDetail();
            return;
        }

        document.getElementById("detailTitle").textContent = match.address;
        document.getElementById("detailCategory").textContent = match.category;
        document.getElementById("detailDate").textContent = formatDate(match.date);
        document.getElementById("detailStatus").textContent = match.status;
        document.getElementById("detailPermitNumber").textContent = match.permitNumber || "-";
        document.getElementById("detailAddress").textContent = match.address;
        document.getElementById("detailApplicant").textContent = match.applicant;
        document.getElementById("detailDescription").textContent = match.description;
        document.getElementById("detailTerms").textContent = match.matchedTerms.length ? match.matchedTerms.join(", ") : "-";
    }

    function exportCsv(items) {
        const headers = ["Date", "Category", "Address", "Description", "Status", "Applicant", "Permit Number", "Application Type", "Matched Terms"];
        const rows = items.map(function (item) {
            return [
                item.date,
                item.category,
                item.address,
                item.description,
                item.status,
                item.applicant,
                item.permitNumber,
                item.applicationType,
                item.matchedTerms.join(", ")
            ];
        });

        const csv = [headers].concat(rows).map(function (row) {
            return row.map(csvEscape).join(",");
        }).join("\r\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "bellingham-clean-energy-permits.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function buildMonthlyBuckets(items) {
        const buckets = new Map();

        for (const item of items) {
            if (!item.date) {
                continue;
            }

            const key = item.date.slice(0, 7);
            if (!buckets.has(key)) {
                const bucketDate = new Date(key + "-01T00:00:00");
                buckets.set(key, {
                    key,
                    count: 0,
                    shortLabel: bucketDate.toLocaleDateString("en-US", { month: "short" }),
                    label: bucketDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                });
            }
            buckets.get(key).count += 1;
        }

        return Array.from(buckets.values()).sort(function (left, right) {
            return compareText(left.key, right.key);
        });
    }

    function countByCategory(items, category) {
        return items.filter(function (item) {
            return item.category === category;
        }).length;
    }

    function countInCurrentMonth(items) {
        if (!latestRecordDate) {
            return 0;
        }

        return items.filter(function (item) {
            if (!item.timestamp) {
                return false;
            }
            const itemDate = new Date(item.timestamp);
            return itemDate.getFullYear() === latestRecordDate.getFullYear() &&
                itemDate.getMonth() === latestRecordDate.getMonth();
        }).length;
    }

    function countInCurrentYear(items) {
        if (!latestRecordDate) {
            return 0;
        }

        return items.filter(function (item) {
            if (!item.timestamp) {
                return false;
            }
            const itemDate = new Date(item.timestamp);
            return itemDate.getFullYear() === latestRecordDate.getFullYear();
        }).length;
    }

    function getAverageMonthlyCount(items) {
        const buckets = buildMonthlyBuckets(items);
        if (!buckets.length) {
            return 0;
        }

        const total = buckets.reduce(function (sum, bucket) {
            return sum + bucket.count;
        }, 0);

        return total / buckets.length;
    }

    function compareText(left, right) {
        return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
    }

    function compareNumbers(left, right) {
        return Number(left || 0) - Number(right || 0);
    }

    function csvEscape(value) {
        const text = String(value ?? "");
        return '"' + text.replaceAll('"', '""') + '"';
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(value);
    }

    function formatOneDecimal(value) {
        return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value);
    }

    function formatDate(value) {
        if (!value) {
            return "Unknown";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function formatTimestamp(value) {
        if (!value) {
            return "Unknown";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return parsed.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function toIsoDate(date) {
        return date.toISOString().slice(0, 10);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function showStatus(message) {
        statusBanner.textContent = message;
        statusBanner.classList.remove("hidden");
    }
})();
