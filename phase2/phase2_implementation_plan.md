# Phase 2 Implementation Plan: Spatial Equity & Property Intelligence

## 1. Objective
Transform the dashboard from a permit tracker into a **Spatial Intelligence Platform** by integrating Environmental Justice (EJ) data and high-resolution Property Parcel boundaries. This will allow stakeholders to visualize adoption trends through an equity lens and verify property-level installations.

---

## 2. Data Analysis (Phase 2 Source Files)

### 2.1 Environmental Justice (EJ) Layer
- **Source:** `phase2/ej2020/EJ_POLY.shp`
- **Key Attributes:**
    - `MUNICIPALI`: Filtered to "BELLINGHAM".
    - `EJ_CRITERI`: Identifies why an area is EJ (Minority, Income, or English Isolation).
    - `TOTAL_POP`: Used for calculating per-capita adoption in EJ vs. non-EJ zones.
- **Utility:** Provides the "Equity Context" for the dashboard.

### 2.2 Property Parcel Layer
- **Source:** `phase2/L3_SHP_M025_BELLINGHAM/.../M025TaxPar_CY25_FY26.shp`
- **Key Attributes:**
    - `MAP_PAR_ID`: Unique lot identifier.
    - `LOC_ID`: Geographic linking ID.
- **Utility:** Provides high-resolution property boundaries, essential for verifying geocoding accuracy and identifying multi-unit vs. single-family installations.

### 2.3 Assessor Metadata
- **Source:** `M025Assess_CY25_FY26.dbf`
- **Utility:** Optional linking to provide "Property Class" (e.g., Residential, Commercial, Mixed Use) in permit details.

---

## 3. Proposed Changes

### 3.1 Data Pipeline & Pre-processing
> [!IMPORTANT]
> **Performance Optimization:** To ensure the dashboard remains fast as a static site, we will convert the Shapefiles into optimized GeoJSON. 
> 1. **Filter:** Subset EJ data to Bellingham only.
> 2. **Simplify:** Reduce geometry precision to keep file sizes < 2MB.
> 3. **Format:** Output to `js/ej-data.js` and `js/parcel-data.js`.

### 3.2 Mapping Enhancements (Leaflet.js)
- **Layer Toggles:** Add a modern layer switcher (styled with Glassmorphism) to toggle:
    - **EJ Status Overlay:** Colored polygons with custom patterns.
    - **Parcel Lines:** Visible only at Zoom 16+ to prevent performance lag.
- **Enhanced Popups:** Integrate EJ criteria into the map popups for permits located in those zones.

### 3.3 Equity Analytics (New Features)
- **The "Equity Scorecard":**
    - [NEW] Hero Metric: `% of Permits in EJ Communities`.
    - [NEW] Detail Badge: A "High Equity Impact" label for records in EJ areas.
- **Spatial Join (Client-side):** 
    - Use `turf.js` or a lightweight point-in-polygon logic to categorize every permit in the current snapshot as either `EJ_ZONE: TRUE` or `FALSE`.

### 3.4 UI/UX Updates
- **Record Explorer:** Add a "Zone" column to the table indicating EJ status.
- **Trend Comparison:** (Optional) Add a chart comparing adoption rates in EJ vs. Non-EJ areas.

---

## 4. Technical Implementation Tasks

### Phase 2.1: Spatial Foundation
- [ ] Add `turf.js` and `shpjs` to `vendor/`.
- [ ] Convert `EJ_POLY` to `js/ej-data.js` (Bellingham subset).
- [ ] Convert `M025TaxPar` to `js/parcel-data.js` (Simplified geometry).

### Phase 2.2: Dashboard Integration
- [ ] Implement `SpatialAnalyzer` module in `js/app.js` to handle point-in-polygon checks.
- [ ] Update `renderStaticMeta()` to calculate equity-specific KPIs.
- [ ] Add `EJ_Zone` property to normalized permit records.

### Phase 2.3: Visual Polish
- [ ] Design EJ legend (Income, Minority, English Isolation color codes).
- [ ] Implement scale-dependent parcel layer visibility.
- [ ] Update Detail View with "Equity Context" section.

---

## 5. Verification Plan

### Automated Verification
- **Geometry Test:** Verify all permit coordinates fall within the Bellingham boundary.
- **Spatial Join Test:** Compare a known EJ-area address against the spatial join output.

### Manual Verification
1. Verify map toggle functionality for both EJ and Parcel layers.
2. Confirm parcels only appear at high zoom levels.
3. Verify that the "Equity Impact" badge appears correctly on records in south/west Bellingham (typical EJ zones).
