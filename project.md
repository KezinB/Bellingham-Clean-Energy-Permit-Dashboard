# Project Plan: Bellingham Clean Energy Permit Dashboard

## Current Status
> [!IMPORTANT]
> **Phase 3: Automation & Infrastructure Complete.**  
> The dashboard is now a fully automated intelligence platform. It features weekly automated data refreshes via GitHub Actions, a modularized "app-core" logic layer for reliability, and a unit-testing suite to ensure data integrity.
> **Status:** Production-ready with automated lifecycle management.

## Project Title
**Municipal-scale clean energy adoption analytics platform : Bellingham Clean Energy Permit Dashboard**  
*Built on permit data with geospatial visualization, spatial equity mapping, and assessor intelligence.*

---

## Presentation Guidance
> [!TIP]
> **Elevator Pitch / Framing:**  
> Position the tool as a self-maintaining municipal intelligence system:  
> *"A fully automated clean energy adoption tracking platform that merges public permit records with property assessor data to provide real-time spatial and economic insights."*

---

## 1. Objective
Develop a lightweight, web-accessible dashboard that visualizes neighborhood-level adoption of clean energy technologies in Bellingham, MA. The system uses public permit data as the primary source, enriched by municipal assessor records, and is deployed as a self-updating static website.

---

## 2. Key Goal
Reduce the need for manual in-person surveys by providing a digital estimation tool that is:
- **Accessible:** Works in any modern browser without specialized software.
- **Automated:** Updates weekly without human intervention.
- **Visual:** Provides map-based context and time-series trends.
- **Reliable:** Protected by automated unit tests and validation scripts.

---

## 3. Technical Stack
- **Frontend:** Vanilla HTML5, CSS3 (Modern Glassmorphism UI), JavaScript (ES6+).
- **Architecture:** Modular "Core/UI" separation for improved stability.
- **Mapping:** Leaflet.js with CartoDB Positron & Esri Satellite layers.
- **Automation:** GitHub Actions (Weekly Workflows) on Windows-latest runners.
- **Data Pipeline:** PowerShell + Python-based enrichment (`scripts/build_permit_dataset.ps1`).
- **Testing:** Custom lightweight JavaScript unit testing suite.
- **Hosting:** GitHub Pages (Static Hosting).

---

## 4. Current Feature Status

| Feature | Status | Description |
| :--- | :--- | :--- |
| **Summary Metrics** | ✅ Done | Total counts, category breakdowns, and time-based KPIs. |
| **Interactive Map** | ✅ Done | Leaflet integration with category-coded markers and Bellingham boundary overlay. |
| **Automated Refresh** | ✅ Done | (Phase 3) Weekly GitHub Actions workflow for zero-touch updates. |
| **Unit Testing** | ✅ Done | (Phase 3) Core logic verification suite (app-core.test.js). |
| **Advanced Filtering** | ✅ Done | Category chips, date range selection, and live text search. |
| **Enhanced Map UI** | ✅ Done | (Phase 3) Native map controls, bold high-contrast layers, and Zoom 10+ parcel visibility. |
| **Spatial Equity** | ✅ Done | Automated EJ status identification and equity metrics. |
| **Parcel Mapping** | ✅ Done | High-resolution property boundary overlay. |
| **Property Intel** | ✅ Done | Integrated assessor data: Property Type, Year Built, and Value. |

---

## 5. Data Strategy

### 5.1 Source
- Public permit records via [Bellingham PermitEyes](https://permiteyes.us/bellingham/publicview.php).
- Municipal Assessor Database (FY26 Snapshot).

### 5.2 Processing Pipeline (Automated)
The project uses a weekly GitHub Actions workflow:
1. **Extraction:** Scrapes live records from the PermitEyes portal.
2. **Enrichment:** Python-based spatial join with Assessor metadata.
3. **Geocoding:** Matches addresses against US Census Bureau API.
4. **Validation:** Runs unit tests on the resulting dataset.
5. **Deployment:** Pushes fresh `permit-data.js` to GitHub Pages.

---

## 6. Spatial & Property Intelligence

### 6.1 Environmental Justice (EJ)
The dashboard uses **MassGIS EJ2020** polygons to identify underserved populations.
- **Automated Tagging:** Every permit is spatially joined to EJ polygons during build-time.
- **Visual Contrast:** High-visibility neon green (`#00ff88`) highlighting for EJ zones.

### 6.2 Property Intel
Integrated **Bellingham Assessor Database (FY26)** to provide property-level context:
- **Year Built:** Correlation between structure age and clean energy adoption.
- **Use Class:** Differentiates between Single Family, Multi-Family, and Commercial.
- **Total Value:** Economic profile of adopters.

---

## 7. Roadmap & Next Steps

### 7.1 Enhancements
- [ ] **Advanced Clustering:** Implement Leaflet.markercluster for better visualization of high-density areas.
- [ ] **Growth Projections:** Basic linear regression for future adoption estimates.
- [ ] **Mobile App PWA:** Convert to a Progressive Web App for better field use.

### 7.2 Data Quality
- [ ] **Geocoding Refinement:** Implement a fallback for failed geocodes (e.g., matching to street centerlines).
- [ ] **Historical Analysis:** Import archived permit data (pre-2020) for longer-term trend mapping.

---

## 8. Deliverables
- ✅ **Static Dashboard:** [Live on GitHub Pages](https://KezinB.github.io/Bellingham-Clean-Energy-Permit-Dashboard/)
- ✅ **Automated Pipeline:** `.github/workflows/refresh-data.yml`.
- ✅ **Testing Suite:** `tests/app-core.test.js` + `package.json` scripts.
- ✅ **Structured Dataset:** Embedded in `js/permit-data.js`.
- ✅ **Documentation:** `README.md`, `project.md`, and `roadmap.md`.

---

## 9. Strategic Direction
This tool serves as a model for **Automated Municipal Intelligence**. By converting fragmented public records into structured spatial data without ongoing manual effort, it provides a template for tracking city-wide sustainability goals in real-time.

---

## 10. Project History
- **2026-04-29:** Initial development complete. Core features functional.
- **2026-05-03:** **Phase 2 Complete.** Integrated EJ Spatial Layers, Parcel Boundaries, and Assessor Metadata.
- **2026-05-13:** **Phase 3 Complete.** Automated data refresh via GitHub Actions. Refactored app-core logic. Added unit tests. Enhanced map contrast and zoom logic (+10 Zoom parcel visibility).
