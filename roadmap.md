# Roadmap

## Overview

This roadmap prioritizes upgrades that improve reliability, performance, maintainability, and analytical value for the Bellingham Clean Energy Permit Dashboard. The goal is to keep the project lightweight while making it more production-ready and easier to evolve.

---

## P1: Stability And Performance

### 1. Reduce Browser Payload
- Convert heavy spatial inputs into lighter delivery formats.
- Simplify parcel geometry before shipping it to the browser.
- Replace raw ZIP-based shapefile loading with preprocessed GeoJSON or vector-ready assets.

**Why this matters**
- The current static app loads large permit and spatial assets in the browser, which slows initial render and mobile performance.

**Estimated effort**
- Medium

### 2. Move Spatial Enrichment To Build Time
- Perform EJ tagging and parcel/property enrichment during the data pipeline step.
- Store enriched permit records directly in the generated dataset.

**Why this matters**
- This removes expensive client-side spatial joins and makes the frontend simpler and faster.

**Estimated effort**
- Medium

### 3. Add Frontend Regression Checks
- Add lightweight tests for:
  - record normalization
  - filtering
  - sorting
  - CSV export
- Add a simple validation step before publishing refreshed data.

**Why this matters**
- Small frontend bugs currently have a large impact because the app is fully static and script-driven.

**Estimated effort**
- Small to Medium

### 4. Pin External Dependencies
- Replace floating CDN versions with explicit versions for all external libraries.
- Optionally vendor critical browser dependencies locally.

**Why this matters**
- Prevents upstream changes from breaking the dashboard unexpectedly.

**Estimated effort**
- Small

---

## P2: User Experience And Insight Quality

### 5. Add Marker Clustering
- Integrate marker clustering for dense map areas.
- Preserve category colors and popup behavior.

**Why this matters**
- Improves readability and navigation when many permits overlap geographically.

**Estimated effort**
- Medium

### 6. Improve Filter Feedback
- Add visible active-filter summaries near the results count.
- Show which category, date range, and month filters are currently applied.
- Add a one-click clear state for each active filter group.

**Why this matters**
- Makes the dashboard easier to understand, especially on mobile and in filtered views.

**Estimated effort**
- Small

### 7. Strengthen Map/Table Coordination
- Highlight map markers when table rows are selected or hovered.
- Scroll to the matching table row when a marker is clicked.
- Keep selected records visually persistent until cleared.

**Why this matters**
- Makes the dashboard feel like one connected exploration tool rather than separate widgets.

**Estimated effort**
- Medium

### 8. Add Better Loading States
- Show separate loading indicators for:
  - permit dataset
  - EJ layer
  - parcel layer
- Show a graceful fallback if one spatial layer fails to load.

**Why this matters**
- Users can distinguish between a slow layer and a broken app.

**Estimated effort**
- Small

---

## P3: Data Quality And Analytical Depth

### 9. Improve Duplicate Detection
- Detect paired permits that refer to the same real-world installation.
- Group related `SOLAR` and `ELECT` records into a shared project identity when appropriate.

**Why this matters**
- Current permit counts may overrepresent actual installed projects.

**Estimated effort**
- Medium to Large

### 10. Add Data Quality Metrics
- Add a dashboard or admin summary for:
  - geocoding success rate
  - unmatched property joins
  - likely duplicate records
  - records missing key metadata

**Why this matters**
- Makes the data pipeline more transparent and easier to validate with stakeholders.

**Estimated effort**
- Medium

### 11. Refine Classification Logic
- Add exclusion rules to reduce false positives.
- Add secondary tags such as:
  - battery
  - retrofit
  - replacement
  - existing system
- Keep the main categories simple while improving analytical depth.

**Why this matters**
- Better classification increases trust in the dashboard and supports richer reporting.

**Estimated effort**
- Medium

---

## P4: Maintainability And Project Structure

### 12. Modularize Frontend Code
- Split `js/app.js` into smaller modules such as:
  - state
  - filters
  - map
  - charts
  - table
  - export

**Why this matters**
- Reduces risk when making changes and makes debugging faster.

**Estimated effort**
- Medium

### 13. Centralize App Configuration
- Move repeated constants and thresholds into a shared config object.
- Include:
  - file paths
  - map defaults
  - zoom thresholds
  - category labels
  - colors

**Why this matters**
- Prevents inconsistencies between UI text and actual logic.

**Estimated effort**
- Small

### 14. Add A Lightweight Build Step
- Add a simple build flow for:
  - minifying assets
  - versioning bundles
  - validating generated data

**Why this matters**
- Preserves the static deployment model while improving consistency and release discipline.

**Estimated effort**
- Medium

### 15. Expand Project Documentation
- Turn `changes_date.md` into an ongoing change log.
- Add release notes and data refresh instructions for non-developers.
- Add a short troubleshooting guide for common update failures.

**Why this matters**
- Makes the project easier to hand off and maintain over time.

**Estimated effort**
- Small

---

## Suggested Implementation Order

1. Reduce browser payload.
2. Move spatial enrichment to build time.
3. Add frontend regression checks.
4. Pin or vendor remaining external dependencies.
5. Add marker clustering.
6. Improve filter feedback and map/table coordination.
7. Improve duplicate detection and classification quality.
8. Modularize the frontend and add a lightweight build step.

---

## Success Criteria

- The dashboard loads faster on average connections and mobile devices.
- Map interaction remains smooth even with large permit datasets.
- Data refreshes become safer and easier to verify.
- The codebase becomes easier to extend without breaking core behavior.
- Stakeholders can trust the analytical outputs more confidently.
