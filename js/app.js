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
    const core = window.DashboardCore;

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
    const footerRefreshTime = document.getElementById("footerRefreshTime");
    const coveragePill = document.getElementById("coverage-pill");
    const methodNote = document.getElementById("methodNote");
    const geocodeCount = document.getElementById("geocodeCount");
    const visibleMapCount = document.getElementById("visibleMapCount");
    const distributionBars = document.getElementById("distributionBars");
    const propertyMixBars = document.getElementById("propertyMixBars");
    const ageBars = document.getElementById("ageBars");
    const valueBars = document.getElementById("valueBars");
    const trendChart = document.getElementById("trendChart");
    const trendNote = document.getElementById("trendNote");
    const ejPercent = document.getElementById("ej-percent");
    const resultsSummaries = document.querySelectorAll(".results-summary");
    const tableNote = document.getElementById("tableNote");
    const tableBody = document.querySelector("#permitTable tbody");
    const recordLimitInput = document.getElementById("recordLimit");
    const searchInput = document.getElementById("permitSearch");
    const searchInputMobile = document.getElementById("permitSearchMobile");
    const filterGroup = document.getElementById("categoryFilters");
    const fromDateDesktopInput = document.getElementById("fromDateDesktop");
    const toDateDesktopInput = document.getElementById("toDateDesktop");
    const fromDateDrawerInput = document.getElementById("fromDateDrawer");
    const toDateDrawerInput = document.getElementById("toDateDrawer");
    const fromDateInputs = [fromDateDesktopInput, fromDateDrawerInput].filter(Boolean);
    const toDateInputs = [toDateDesktopInput, toDateDrawerInput].filter(Boolean);
    const sortRecordsInput = document.getElementById("sortRecords");
    const exportCsvButton = document.getElementById("exportCsv");
    const resetFiltersButton = document.getElementById("resetFilters");
    const detailCard = document.getElementById("recordDetailCard");
    const closeDetailButton = document.getElementById("closeDetail");
    const mobileSearchTrigger = document.getElementById("mobileSearchTrigger");
    const searchDrawerOverlay = document.getElementById("searchDrawerOverlay");
    const closeSearchDrawer = document.getElementById("closeSearchDrawer");
    const mobileFilterTrigger = document.getElementById("mobileFilterTrigger");
    const filterDrawerOverlay = document.getElementById("filterDrawerOverlay");
    const closeFilterDrawer = document.getElementById("closeFilterDrawer");
    const mapHomeBtn = document.getElementById("mapHome");
    const mapResetBtn = document.getElementById("mapReset");
    let records = [];
    let state = {};
    let map = null;
    let latestRecordDate = null;

    try {
        if (!core) {
            showStatus("Dashboard core utilities failed to load.");
            return;
        }

        if (!dataset || !Array.isArray(dataset.records)) {
            showStatus("Permit data is unavailable. Run scripts/build_permit_dataset.ps1 to regenerate the embedded snapshot.");
            return;
        }

        records = dataset.records
            .map(normalizeRecord)
            .sort((left, right) => right.timestamp - left.timestamp);

        const latestRecordTimestamp = records.length ? records[0].timestamp : 0;
        latestRecordDate = latestRecordTimestamp ? new Date(latestRecordTimestamp) : null;

        state = {
            categories: [...CATEGORY_ORDER],
            selectedMonth: null,
            query: "",
            fromDate: "",
            toDate: "",
            sort: "date-desc",
            tableLimit: DEFAULT_TABLE_LIMIT,
            selectedRecordId: null,
            ejData: null,
            parcelData: null
        };

        map = createMap();
        renderStaticMeta(records);
        wireControls();
        loadSpatialLayers();
        render();
    } catch (criticalError) {
        console.error("Critical Init Error:", criticalError);
        showStatus("Dashboard Error: " + criticalError.message + ". Check console for details.");
    }

    function normalizeRecord(record) {
        return core.normalizeRecord(record, CATEGORY_ORDER);
    }

    async function loadSpatialLayers() {
        if (!window.shp || !window.turf) return;

        const getUrl = (path) => {
            try { return new URL(path, window.location.href).href; }
            catch (e) { return window.location.origin + "/" + path; }
        };

        try {
            const ejFeatures = await shp(getUrl("phase2/zips/ej2020.zip"));
            state.ejData = {
                type: "FeatureCollection",
                features: ejFeatures.features.filter(f => String(f.properties.MUNICIPALI || f.properties.MUNICIPAL || "").toUpperCase() === "BELLINGHAM")
            };

            records.forEach(record => {
                if (record.lat && record.lng) {
                    const pt = turf.point([record.lng, record.lat]);
                    const match = state.ejData.features.find(feat => turf.booleanPointInPolygon(pt, feat));
                    if (match) {
                        record.isEjArea = true;
                        record.ejCriteria = match.properties.EJ_CRITERI || match.properties.EJ_CRIT_DE || "Yes";
                    }
                }
            });

            if (map && state.ejData) {
                map.ejLayer = L.geoJSON(state.ejData, {
                    style: { color: "#00ff88", fillColor: "#00ff88", weight: 3, opacity: 0.9, fillOpacity: 0.25 },
                    onEachFeature: (f, l) => l.bindPopup(`<strong>EJ Community</strong><br>${f.properties.EJ_CRIT_DE || ''}`)
                });
                const toggle = document.getElementById("toggleEjLayer");
                if (toggle && toggle.checked) map.ejLayer.addTo(map.instance);
            }

            const parcelFeatures = await shp(getUrl("phase2/zips/L3_SHP_M025_BELLINGHAM.zip"));
            state.parcelData = parcelFeatures;
            if (map && state.parcelData) {
                map.parcelLayer = L.geoJSON(state.parcelData, {
                    style: { color: "#0f172a", weight: 1.5, opacity: 0.85, fillOpacity: 0 }
                });
                map.instance.on("zoomend", updateParcelVisibility);
                updateParcelVisibility();
            }
            renderStaticMeta(records);
            render();
        } catch (err) { console.error("Spatial load error:", err); }
    }

    function updateParcelVisibility() {
        if (!map || !map.parcelLayer) return;
        const zoom = map.instance.getZoom();
        const toggle = document.getElementById("toggleParcelLayer");
        if (toggle && toggle.checked && zoom >= 10) {
            if (!map.instance.hasLayer(map.parcelLayer)) map.parcelLayer.addTo(map.instance);
        } else {
            if (map.instance.hasLayer(map.parcelLayer)) map.instance.removeLayer(map.parcelLayer);
        }
    }

    function wireControls() {
        const applySearch = document.getElementById("applySearch");
        const clearSearch = document.getElementById("clearSearch");
        const applyFilters = document.getElementById("applyFilters");

        if (applySearch) {
            applySearch.addEventListener("click", () => {
                state.query = (searchInputMobile?.value || searchInput?.value || "").trim().toLowerCase();
                render();
                searchDrawerOverlay.classList.remove("active");
                document.body.style.overflow = "";
            });
        }

        if (clearSearch) {
            clearSearch.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                if (searchInputMobile) searchInputMobile.value = "";
                state.query = "";
                render();
            });
        }

        if (applyFilters) {
            applyFilters.addEventListener("click", () => {
                state.fromDate = getLinkedInputValue(fromDateInputs);
                state.toDate = getLinkedInputValue(toDateInputs);
                state.sort = sortRecordsInput.value;
                render();
                filterDrawerOverlay.classList.remove("active");
                document.body.style.overflow = "";
            });
        }

        recordLimitInput.addEventListener("change", () => {
            state.tableLimit = Number(recordLimitInput.value) || DEFAULT_TABLE_LIMIT;
            render();
        });

        const toggleEjLayer = document.getElementById("toggleEjLayer");
        if (toggleEjLayer) {
            toggleEjLayer.addEventListener("change", function() {
                if (map && map.ejLayer) {
                    if (this.checked) map.ejLayer.addTo(map.instance);
                    else map.instance.removeLayer(map.ejLayer);
                }
                updateLegendUI();
            });
        }

        const toggleParcelLayer = document.getElementById("toggleParcelLayer");
        if (toggleParcelLayer) {
            toggleParcelLayer.addEventListener("change", () => {
                updateParcelVisibility();
                updateLegendUI();
            });
        }

        exportCsvButton.addEventListener("click", () => exportCsv(getFilteredRecords()));

        resetFiltersButton.addEventListener("click", () => {
            state.categories = [...CATEGORY_ORDER];
            state.query = "";
            state.fromDate = "";
            state.toDate = "";
            state.selectedMonth = null;
            state.selectedRecordId = null;
            if (searchInput) searchInput.value = "";
            if (searchInputMobile) searchInputMobile.value = "";
            setLinkedInputValue(fromDateInputs, "");
            setLinkedInputValue(toDateInputs, "");
            
            document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
            const allBtn = document.querySelector('.filter-chip[data-category="All"]');
            if (allBtn) allBtn.classList.add("active");
            
            updateLegendUI();
            render();
            closeDetailPanel();
            if (map && map.boundaryLayer) map.instance.fitBounds(map.boundaryLayer.getBounds());
        });

        fromDateInputs.forEach((input) => {
            input.addEventListener("input", () => syncLinkedInputs(input, fromDateInputs));
        });

        toDateInputs.forEach((input) => {
            input.addEventListener("input", () => syncLinkedInputs(input, toDateInputs));
        });

        if (mapHomeBtn) {
            mapHomeBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (map && map.boundaryLayer) {
                    map.instance.fitBounds(map.boundaryLayer.getBounds());
                } else if (map) {
                    map.instance.setView(MAP_CENTER, MAP_HOME_ZOOM);
                }
            });
        }

        if (mapResetBtn) {
            mapResetBtn.addEventListener("click", (e) => {
                e.preventDefault();
                if (state.selectedRecordId) {
                    state.selectedRecordId = null;
                    closeDetailPanel();
                    render();
                }
                const visibleRecords = getFilteredRecords().filter(r => r.lat && r.lng);
                if (map && visibleRecords.length) {
                    const group = L.featureGroup(visibleRecords.map(item => 
                        L.circleMarker([item.lat, item.lng])
                    ));
                    map.instance.fitBounds(group.getBounds().pad(0.1));
                } else if (map && map.boundaryLayer) {
                    map.instance.fitBounds(map.boundaryLayer.getBounds());
                }
            });
        }

        closeDetailButton.addEventListener("click", hideDetail);

        if (mobileSearchTrigger) {
            mobileSearchTrigger.addEventListener("click", () => {
                searchDrawerOverlay.classList.add("active");
                document.body.style.overflow = "hidden";
                setTimeout(() => (searchInputMobile || searchInput)?.focus(), 400);
            });
        }
        if (closeSearchDrawer) closeSearchDrawer.addEventListener("click", () => {
            searchDrawerOverlay.classList.remove("active");
            document.body.style.overflow = "";
        });

        if (mobileFilterTrigger) mobileFilterTrigger.addEventListener("click", () => {
            filterDrawerOverlay.classList.add("active");
            document.body.style.overflow = "hidden";
        });
        if (closeFilterDrawer) closeFilterDrawer.addEventListener("click", () => {
            filterDrawerOverlay.classList.remove("active");
            document.body.style.overflow = "";
        });

        const filterChips = filterGroup.querySelectorAll(".filter-chip");
        filterChips.forEach(chip => {
            chip.addEventListener("click", () => {
                const cat = chip.dataset.category;
                if (cat === "All") {
                    state.categories = [...CATEGORY_ORDER];
                } else {
                    state.categories = [cat];
                }
                syncChips();
                render();
            });
        });
    }

    function renderStaticMeta(allRecords) {
        const meta = dataset.meta || {};
        totalCount.textContent = formatNumber(allRecords.length);
        solarCount.textContent = formatNumber(countByCategory(allRecords, "Solar"));
        evCount.textContent = formatNumber(countByCategory(allRecords, "EV Charger"));
        hpCount.textContent = formatNumber(countByCategory(allRecords, "Heat Pump"));
        monthCount.textContent = formatNumber(countInCurrentMonth(allRecords));
        yearCount.textContent = formatNumber(countInCurrentYear(allRecords));
        latestDate.textContent = latestRecordDate ? formatDate(latestRecordDate) : "-";
        avgMonthlyCount.textContent = formatOneDecimal(getAverageMonthlyCount(allRecords));
        
        const inEj = allRecords.filter(r => r.isEjArea).length;
        ejPercent.textContent = allRecords.length ? Math.round((inEj / allRecords.length) * 100) + "%" : "0%";

        if (meta.generatedAt) {
            const formattedTimestamp = formatTimestamp(meta.generatedAt);
            updatedPill.textContent = "Updated: " + formattedTimestamp;
            if (footerRefreshTime) footerRefreshTime.textContent = "Last refresh: " + formattedTimestamp;
        } else if (footerRefreshTime) {
            footerRefreshTime.textContent = "Last refresh: Unknown";
        }
        if (coveragePill) coveragePill.textContent = "Map coverage: " + (meta.geocodedRecords || 0) + " / " + allRecords.length;

        initializeDateRange(allRecords);
    }

    function initializeDateRange(allRecords) {
        const dated = allRecords.filter(r => r.timestamp);
        if (!dated.length) return;
        const minDate = dated[dated.length - 1].date;
        const maxDate = dated[0].date;

        fromDateInputs.forEach((input) => {
            input.min = minDate;
            input.max = maxDate;
        });

        toDateInputs.forEach((input) => {
            input.min = minDate;
            input.max = maxDate;
        });
    }

    function renderDistribution(allRecords) {
        distributionBars.innerHTML = "";
        const max = Math.max(1, ...CATEGORY_ORDER.map(c => countByCategory(allRecords, c)));
        const shortLabels = { "Solar": "Solar", "EV Charger": "EV", "Heat Pump": "Heat Pump" };
        CATEGORY_ORDER.forEach(c => {
            distributionBars.appendChild(createVerticalBarItem(shortLabels[c], countByCategory(allRecords, c), max, CATEGORY_CLASS[c], false, null));
        });
    }

    function renderPropertyMixChart(allRecords) {
        propertyMixBars.innerHTML = "";
        const data = allRecords.filter(r => r.propertyType);
        if (!data.length) {
            propertyMixBars.innerHTML = '<p class="chart-empty-msg">Data enrichment pending.</p>';
            return;
        }
        const groups = { "Single Family": 0, "Multi-Family": 0, "Commercial": 0, "Other": 0 };
        data.forEach(r => {
            const t = String(r.propertyType).toLowerCase();
            if (t.includes("single family") || t.includes("condominium")) groups["Single Family"]++;
            else if (t.includes("two-family") || t.includes("three-family") || t.includes("multi-family")) groups["Multi-Family"]++;
            else if (t.includes("commercial") || t.includes("industrial") || t.includes("mixed use")) groups["Commercial"]++;
            else groups["Other"]++;
        });
        const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
        const max = Math.max(1, ...sorted.map(g => g[1]));
        sorted.forEach(([l, c]) => propertyMixBars.appendChild(createVerticalBarItem(l, c, max, "property-mix-fill", false, null)));
    }

    function renderAgeChart(allRecords) {
        ageBars.innerHTML = "";
        const data = allRecords.filter(r => r.yearBuilt);
        if (!data.length) {
            ageBars.innerHTML = '<p class="chart-empty-msg">Data enrichment pending.</p>';
            return;
        }
        const counts = {};
        data.forEach(r => {
            let d;
            if (r.yearBuilt < 1950) d = "Pre\u201150s";
            else if (r.yearBuilt >= 2020) d = "2020+";
            else d = Math.floor(r.yearBuilt / 10) * 10 + "s";
            counts[d] = (counts[d] || 0) + 1;
        });
        const order = ["Pre\u201150s", "1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020+"];
        const max = Math.max(1, ...Object.values(counts));
        order.forEach(d => ageBars.appendChild(createVerticalBarItem(d, counts[d] || 0, max, "age-fill", false, null)));
    }

    function renderValueChart(allRecords) {
        valueBars.innerHTML = "";
        const data = allRecords.filter(r => r.propertyValue > 0);
        if (!data.length) {
            valueBars.innerHTML = '<p class="chart-empty-msg">Data enrichment pending.</p>';
            return;
        }
        const brackets = { "<$400k": 0, "$400-600k": 0, "$600-800k": 0, ">$800k": 0 };
        data.forEach(r => {
            const v = r.propertyValue;
            if (v < 400000) brackets["<$400k"]++;
            else if (v < 600000) brackets["$400-600k"]++;
            else if (v < 800000) brackets["$600-800k"]++;
            else brackets[">$800k"]++;
        });
        const max = Math.max(1, ...Object.values(brackets));
        Object.entries(brackets).forEach(([l, c]) => valueBars.appendChild(createVerticalBarItem(l, c, max, "value-fill", false, null)));
    }

    function renderTrend(allRecords) {
        trendChart.innerHTML = "";
        const buckets = buildMonthlyBuckets(allRecords);
        if (!buckets.length) {
            trendNote.textContent = "No dated permits available.";
            return;
        }
        const max = Math.max(...buckets.map(b => b.count), 1);
        const recent = buckets.slice(-12);
        trendNote.textContent = `Visualizing trends for ${allRecords.length} permits.`;
        recent.forEach(b => {
            trendChart.appendChild(createVerticalBarItem(
                b.shortLabel, 
                b.count, 
                max, 
                "", 
                state.selectedMonth === b.key, 
                () => { state.selectedMonth = (state.selectedMonth === b.key ? null : b.key); render(); }
            ));
        });
    }

    
    function createVerticalBarItem(label, count, max, colorClass, isActive, onClick) {
        const item = document.createElement("div");
        item.className = "trend-item" + (isActive ? " is-active" : "");
        if (onClick) item.onclick = onClick;
        
        const countEl = document.createElement("span");
        countEl.className = "trend-count";
        countEl.textContent = formatNumber(count);
        
        const bar = document.createElement("div");
        bar.className = "trend-bar " + (colorClass || "");
        bar.style.height = Math.max((count / max) * 100, count ? 8 : 2) + "%";
        
        const labelEl = document.createElement("span");
        labelEl.className = "trend-label";
        labelEl.textContent = label;
        
        item.append(countEl, bar, labelEl);
        return item;
    }

    function createBarRow(label, count, max, colorClass) {
        const row = document.createElement("div");
        row.className = "bar-row";
        row.innerHTML = `<div class="bar-labels"><span>${label}</span><span>${formatNumber(count)}</span></div>
                        <div class="bar-track"><div class="bar-fill ${colorClass || ""}" style="--bar-percent: ${(count/max)*100}%"></div></div>`;
        return row;
    }

    function syncLinkedInputs(sourceInput, inputs) {
        inputs.forEach((input) => {
            if (input !== sourceInput) input.value = sourceInput.value;
        });
    }

    function setLinkedInputValue(inputs, value) {
        inputs.forEach((input) => {
            input.value = value;
        });
    }

    function getLinkedInputValue(inputs) {
        const populatedInput = inputs.find((input) => input.value);
        return populatedInput ? populatedInput.value : "";
    }

    function render() {
        const filtered = sortRecords(getFilteredRecords());
        const geocoded = filtered.filter(r => r.lat && r.lng);
        
        // Trend filter (ignore selected month)
        const trendSource = records.filter(r => {
            if (!state.categories.includes(r.category)) return false;
            if (state.fromDate && r.date < state.fromDate) return false;
            if (state.toDate && r.date > state.toDate) return false;
            if (state.query) {
                const searchable = `${r.address} ${r.description} ${r.applicant} ${r.permitNumber}`.toLowerCase();
                if (!searchable.includes(state.query)) return false;
            }
            return true;
        });

        const text = `${filtered.length.toLocaleString()} permits match. ${geocoded.length.toLocaleString()} have coordinates.`;
        resultsSummaries.forEach(el => el.textContent = text);
        visibleMapCount.textContent = formatNumber(geocoded.length);

        renderTable(filtered.slice(0, state.tableLimit));
        renderMap(geocoded);
        renderTrend(trendSource);
        renderDistribution(filtered);
        renderPropertyMixChart(filtered);
        renderAgeChart(filtered);
        renderValueChart(filtered);
        syncSelectedRecord(filtered);
        updateLegendUI();
    }

    function getFilteredRecords() {
        return core.filterRecords(records, state);
    }

    function sortRecords(items) {
        return core.sortRecords(items, state.sort);
    }

    function renderTable(items) {
        tableBody.innerHTML = items.length ? "" : '<tr><td colspan="7">No results found.</td></tr>';
        items.forEach(item => {
            const row = document.createElement("tr");
            const ejStatusMarkup = item.isEjArea
                ? '<span class="ej-badge">Yes</span>'
                : (item.lat && item.lng ? "Outside EJ" : "Unknown");
            row.className = item.id === state.selectedRecordId ? "is-selected" : "";
            row.innerHTML = `<td>${formatDate(item.date)}</td>
                             <td><span class="table-badge ${CATEGORY_CLASS[item.category]}">${item.category}</span></td>
                             <td>${item.address}</td>
                             <td class="description-cell">${item.description}</td>
                             <td class="status-text">${item.status}</td>
                             <td class="ej-status-cell">${item.isEjArea ? '<span class="ej-badge">Yes</span>' : "—"}</td>
                             <td><button class="action-button compact">View</button></td>`;
            row.querySelector(".ej-status-cell").innerHTML = ejStatusMarkup;
            row.querySelector("button").onclick = () => showDetail(item);
            tableBody.appendChild(row);
        });
    }

    function renderMap(items) {
        if (!map) return;
        map.layer.clearLayers();
        if (!items.length) {
            if (map.boundaryLayer) map.instance.fitBounds(map.boundaryLayer.getBounds());
            return;
        }
        const markers = items.map(item => {
            const m = L.circleMarker([item.lat, item.lng], { radius: 5, color: CATEGORY_COLORS[item.category], weight: 1, fillColor: CATEGORY_COLORS[item.category], fillOpacity: 0.7 });
            m.bindPopup(buildPopupMarkup(item)).on("click", () => showDetail(item));
            return m;
        });
        const group = L.featureGroup(markers).addTo(map.layer);
        map.instance.fitBounds(group.getBounds().pad(0.1));
    }

    function createMap() {
        if (!window.L) return null;
        const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 });
        const light = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 20 });
        const instance = L.map("permitMap", { scrollWheelZoom: false, layers: [satellite] }).setView(MAP_CENTER, MAP_HOME_ZOOM);
        L.control.layers({ "Satellite": satellite, "Street": light }, null, { position: 'topright', collapsed: false }).addTo(instance);

        let boundaryLayer = null;
        if (window.BELLINGHAM_BOUNDARY) {
            boundaryLayer = L.geoJSON(window.BELLINGHAM_BOUNDARY, { style: { color: "#6366f1", weight: 2, fillOpacity: 0.03, dashArray: "5,5" } }).addTo(instance);
            instance.fitBounds(boundaryLayer.getBounds());
        }
        addLegend(instance);
        return { instance, layer: L.layerGroup().addTo(instance), boundaryLayer };
    }

    function addLegend(instance) {
        const LegendControl = L.Control.extend({
            options: { position: "bottomright" },
            onAdd: function () {
                const div = L.DomUtil.create("div", "map-legend");
                div.innerHTML = `<div class="map-legend-title">Categories</div>`;

                for (const cat of CATEGORY_ORDER) {
                    const item = L.DomUtil.create("div", "legend-item", div);
                    item.dataset.category = cat;
                    if (!state.categories.includes(cat)) item.classList.add("is-inactive");

                    const dot = L.DomUtil.create("span", "legend-color " + CATEGORY_CLASS[cat], item);
                    const label = document.createTextNode(cat === "EV Charger" ? "EV Chargers" : cat + "s");
                    item.appendChild(label);

                    L.DomEvent.on(item, "click", (e) => {
                        L.DomEvent.stopPropagation(e);
                        toggleCategory(cat);
                    });
                }

                // Boundary item
                const bItem = L.DomUtil.create("div", "legend-item", div);
                bItem.dataset.category = "Boundary";
                bItem.innerHTML = `<span class="legend-color boundary"></span>Town Boundary`;
                L.DomEvent.on(bItem, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (map && map.boundaryLayer) {
                        if (map.instance.hasLayer(map.boundaryLayer)) map.instance.removeLayer(map.boundaryLayer);
                        else map.boundaryLayer.addTo(map.instance);
                        updateLegendUI();
                    }
                });

                // EJ item
                const ejItem = L.DomUtil.create("div", "legend-item", div);
                ejItem.dataset.category = "EJ";
                ejItem.style.marginTop = "0.5rem";
                ejItem.style.paddingTop = "0.5rem";
                ejItem.style.borderTop = "1px solid rgba(0,0,0,0.05)";
                ejItem.innerHTML = `<span class="legend-color ej-zone"></span>EJ Community`;
                L.DomEvent.on(ejItem, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    const checkbox = document.getElementById("toggleEjLayer");
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event("change"));
                    }
                });

                // Parcel item
                const pItem = L.DomUtil.create("div", "legend-item", div);
                pItem.dataset.category = "Parcel";
                pItem.innerHTML = `<span class="legend-color parcel"></span>Property Parcels (Zoom +10)`;
                L.DomEvent.on(pItem, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    const checkbox = document.getElementById("toggleParcelLayer");
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event("change"));
                    }
                });

                return div;
            }
        });
        instance.addControl(new LegendControl());
    }

    function toggleCategory(category) {
        if (!CATEGORY_ORDER.includes(category)) return;

        if (state.categories.includes(category)) {
            state.categories = state.categories.length === 1
                ? [...CATEGORY_ORDER]
                : state.categories.filter((item) => item !== category);
        } else {
            state.categories = CATEGORY_ORDER.filter((item) => state.categories.includes(item) || item === category);
        }

        syncChips();
        render();
    }

    function buildPopupMarkup(item) {
        return `<div class="popup-card"><h3>${escapeHtml(item.address)}</h3>
                ${item.isEjArea ? '<div class="popup-ej-badge">EJ Community</div>' : ''}
                <p><strong>Date:</strong> ${formatDate(item.date)}</p>
                <p><strong>Description:</strong> ${escapeHtml(item.description)}</p>
                <span class="popup-badge ${CATEGORY_CLASS[item.category]}">${item.category}</span></div>`;
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
        document.getElementById("detailTerms").textContent = item.matchedTerms.join(", ") || "-";
        document.getElementById("detailPropertyType").textContent = item.propertyType || "Unknown";
        document.getElementById("detailYearBuilt").textContent = item.yearBuilt || "Unknown";
        document.getElementById("detailPropertyValue").textContent = item.propertyValue ? "$" + formatNumber(item.propertyValue) : "Unknown";
        
        const ej = document.getElementById("detailEjBlock");
        if (item.isEjArea) { ej.style.display = "block"; document.getElementById("detailEjCriteria").textContent = item.ejCriteria; }
        else ej.style.display = "none";
        
        render();
        detailCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function closeDetailPanel() {
        detailCard.classList.add("hidden");
    }

    function hideDetail() {
        state.selectedRecordId = null;
        closeDetailPanel();
        render();
    }
    
    function syncSelectedRecord(filteredItems) {
        if (!state.selectedRecordId) return;
        const exists = filteredItems.some(r => r.id === state.selectedRecordId);
        if (!exists) {
            hideDetail();
        }
    }

    function syncChips() {
        const chips = filterGroup.querySelectorAll(".filter-chip");
        chips.forEach(c => {
            const cat = c.dataset.category;
            if (cat === "All") c.classList.toggle("active", state.categories.length === CATEGORY_ORDER.length);
            else c.classList.toggle("active", state.categories.length === 1 && state.categories[0] === cat);
        });
    }
    function updateLegendUI() {
        const legendItems = document.querySelectorAll(".legend-item");
        legendItems.forEach((item) => {
            const cat = item.dataset.category;
            if (cat === "EJ") {
                const checkbox = document.getElementById("toggleEjLayer");
                item.classList.toggle("is-inactive", checkbox && !checkbox.checked);
            } else if (cat === "Boundary") {
                if (map && map.boundaryLayer) {
                    item.classList.toggle("is-inactive", !map.instance.hasLayer(map.boundaryLayer));
                }
            } else if (cat === "Parcel") {
                const checkbox = document.getElementById("toggleParcelLayer");
                item.classList.toggle("is-inactive", checkbox && !checkbox.checked);
            } else {
                item.classList.toggle("is-inactive", !state.categories.includes(cat));
            }
        });
    }

    function buildMonthlyBuckets(items) {
        return core.buildMonthlyBuckets(items);
    }

    function countByCategory(items, cat) { return items.filter(i => i.category === cat).length; }
    function countInCurrentMonth(items) {
        if (!latestRecordDate) return 0;
        return items.filter(i => {
            const d = new Date(i.timestamp);
            return d.getFullYear() === latestRecordDate.getFullYear() && d.getMonth() === latestRecordDate.getMonth();
        }).length;
    }
    function countInCurrentYear(items) {
        if (!latestRecordDate) return 0;
        return items.filter(i => new Date(i.timestamp).getFullYear() === latestRecordDate.getFullYear()).length;
    }
    function getAverageMonthlyCount(items) {
        const b = buildMonthlyBuckets(items);
        return b.length ? items.length / b.length : 0;
    }

    function exportCsv(items) {
        const csv = core.exportRecordsToCsv(items);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `bellingham-clean-energy-permits-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function formatNumber(v) { return new Intl.NumberFormat("en-US").format(v); }
    function formatOneDecimal(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    function formatDate(v) { return v ? new Date(v).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "-"; }
    function formatTimestamp(v) { return v ? new Date(v).toLocaleString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }) : "-"; }
    function escapeHtml(v) { return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
    function showStatus(m) { statusBanner.textContent = m; statusBanner.classList.remove("hidden"); }

})();
