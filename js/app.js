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
    const TABLE_LIMIT = 150;

    const dataset = window.PERMIT_DATA;
    const statusBanner = document.getElementById("statusBanner");
    const totalCount = document.getElementById("total-count");
    const solarCount = document.getElementById("solar-count");
    const evCount = document.getElementById("ev-count");
    const hpCount = document.getElementById("hp-count");
    const updatedPill = document.getElementById("updated-pill");
    const coveragePill = document.getElementById("coverage-pill");
    const methodNote = document.getElementById("methodNote");
    const geocodeCount = document.getElementById("geocodeCount");
    const visibleMapCount = document.getElementById("visibleMapCount");
    const distributionBars = document.getElementById("distributionBars");
    const resultsSummary = document.getElementById("resultsSummary");
    const tableNote = document.getElementById("tableNote");
    const tableBody = document.querySelector("#permitTable tbody");
    const searchInput = document.getElementById("permitSearch");
    const filterGroup = document.getElementById("categoryFilters");

    if (!dataset || !Array.isArray(dataset.records)) {
        showStatus("Permit data is unavailable. Run scripts/build_permit_dataset.ps1 to regenerate the embedded snapshot.");
        return;
    }

    const records = dataset.records
        .map(normalizeRecord)
        .sort((left, right) => right.timestamp - left.timestamp);

    const state = {
        category: "All",
        query: ""
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
    }

    function renderStaticMeta(allRecords) {
        const meta = dataset.meta || {};
        updatedPill.textContent = "Updated: " + formatTimestamp(meta.generatedAt);
        coveragePill.textContent = "Map coverage: " + (meta.geocodedRecords || 0) + " / " + allRecords.length + " permits";
        methodNote.textContent = meta.methodology || "Keyword-based classification from permit descriptions.";
        geocodeCount.textContent = String(meta.geocodedRecords || 0);

        totalCount.textContent = formatNumber(allRecords.length);
        solarCount.textContent = formatNumber(countByCategory(allRecords, "Solar"));
        evCount.textContent = formatNumber(countByCategory(allRecords, "EV Charger"));
        hpCount.textContent = formatNumber(countByCategory(allRecords, "Heat Pump"));

        renderDistribution(allRecords);
    }

    function renderDistribution(allRecords) {
        distributionBars.innerHTML = "";
        const maxCount = Math.max(
            1,
            ...CATEGORY_ORDER.map((category) => countByCategory(allRecords, category))
        );

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

    function render() {
        const filtered = getFilteredRecords();
        const geocodedFiltered = filtered.filter((record) => record.lat !== null && record.lng !== null);

        resultsSummary.textContent =
            formatNumber(filtered.length) +
            " permits match the current view. " +
            formatNumber(geocodedFiltered.length) +
            " of them have usable map coordinates.";
        visibleMapCount.textContent = formatNumber(geocodedFiltered.length);
        tableNote.textContent =
            filtered.length > TABLE_LIMIT
                ? "Showing the most recent " + TABLE_LIMIT + " matching permits."
                : "Showing all matching permits.";

        renderTable(filtered.slice(0, TABLE_LIMIT));
        renderMap(geocodedFiltered);
    }

    function getFilteredRecords() {
        return records.filter(function (record) {
            const categoryMatch = state.category === "All" || record.category === state.category;
            if (!categoryMatch) {
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
                record.permitNumber
            ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(state.query);
        });
    }

    function renderTable(items) {
        tableBody.innerHTML = "";

        if (!items.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 5;
            cell.textContent = "No permits match the current filters.";
            row.appendChild(cell);
            tableBody.appendChild(row);
            return;
        }

        for (const item of items) {
            const row = document.createElement("tr");
            row.appendChild(makeCell(formatDate(item.date)));
            row.appendChild(makeCategoryCell(item.category));
            row.appendChild(makeCell(item.address));
            row.appendChild(makeCell(item.description));
            row.appendChild(makeStatusCell(item.status));
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
            map.instance.setView(MAP_CENTER, MAP_HOME_ZOOM);
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
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(instance);

        const layer = L.layerGroup().addTo(instance);
        const focusLayer = L.layerGroup().addTo(instance);
        addHomeControl(instance);

        return { instance, layer, focusLayer };
    }

    function drawFocusArea(bounds) {
        if (!map) {
            return;
        }

        clearFocusArea();

        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();

        if (southWest.lat === northEast.lat && southWest.lng === northEast.lng) {
            const focusCircle = L.circle(bounds.getCenter(), {
                radius: 180,
                color: "#2b4d66",
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0
            });
            focusCircle.addTo(map.focusLayer);
            return;
        }

        const focusRectangle = L.rectangle(bounds.pad(0.08), {
            color: "#2b4d66",
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0
        });
        focusRectangle.addTo(map.focusLayer);
    }

    function clearFocusArea() {
        if (map && map.focusLayer) {
            map.focusLayer.clearLayers();
        }
    }

    function addHomeControl(instance) {
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
                    instance.setView(MAP_CENTER, MAP_HOME_ZOOM);
                });

                return container;
            }
        });

        instance.addControl(new HomeControl());
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

    function countByCategory(items, category) {
        return items.filter(function (item) {
            return item.category === category;
        }).length;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(value);
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
