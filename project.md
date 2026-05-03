# Project Plan: Bellingham Clean Energy Permit Dashboard

## Current Status
> [!IMPORTANT]
> **Phase 2: Spatial & Property Intelligence Integrated.**  
> The dashboard has been transformed into a Spatial Intelligence Platform. It now features Environmental Justice (EJ) analytics, property parcel boundaries, and assessor-linked metadata (Property Value, Year Built, Use Class).
> **Status:** Production-ready and fully integrated.

## Project Title
**Municipal-scale clean energy adoption analytics platform : Bellingham Clean Energy Permit Dashboard**  
*Built on permit data with geospatial visualization, spatial equity mapping, and assessor intelligence.*

---

## Presentation Guidance
> [!TIP]
> **Elevator Pitch / Framing:**  
> Avoid describing the technical stack (HTML/CSS/JS). Instead, position the tool as:  
> *"A municipal-scale clean energy adoption analytics platform built on permit data with geospatial visualization and automated data pipeline."*

---

## 1. Objective
Develop a lightweight, web-accessible dashboard that visualizes neighborhood-level adoption of clean energy technologies in Bellingham, MA. The system uses public permit data as the primary source and is deployed as a static website for remote stakeholder validation.

---

## 2. Key Goal
Reduce the need for manual in-person surveys by providing a digital estimation tool that is:
- **Accessible:** Works in any modern browser without specialized software.
- **Dynamic:** Allows users to filter by date, category, and keyword.
- **Visual:** Provides map-based context and time-series trends.

---

## 3. Technical Stack
- **Frontend:** Vanilla HTML5, CSS3 (Modern Glassmorphism UI), JavaScript (ES6+).
- **Mapping:** Leaflet.js with CartoDB Positron & Esri Satellite layers.
- **Data Pipeline:** PowerShell-based automation (`scripts/build_permit_dataset.ps1`).
- **Hosting:** GitHub Pages (Static Hosting).

---

## 4. Current Feature Status

| Feature | Status | Description |
| :--- | :--- | :--- |
| **Summary Metrics** | ✅ Done | Total counts, category breakdowns, and time-based KPIs (new this month/year). |
| **Interactive Map** | ✅ Done | Leaflet integration with category-coded markers and Bellingham boundary overlay. |
| **Advanced Filtering** | ✅ Done | Category chips, date range selection, and live text search. |
| **Time Intelligence** | ✅ Done | 12-month rolling trend chart and monthly average tracking. |
| **Data Distribution** | ✅ Done | Visual bar stack showing the mix of Solar vs. EV vs. Heat Pumps. |
| **Record Explorer** | ✅ Done | Sortable table with "View" detail view for deep-dive inspection. |
| **Data Export** | ✅ Done | CSV export of filtered datasets for offline analysis. |
| **Responsive Design** | ✅ Done | Mobile-friendly layout using CSS Grid and Flexbox. |
| **Spatial Equity** | ✅ Done | (Phase 2) Automated EJ status identification and equity metrics. |
| **Parcel Mapping** | ✅ Done | (Phase 2) High-resolution property boundary overlay (Zoom 17+). |
| **Property Intel** | ✅ Done | (Phase 2) Linked assessor data: Property Type, Year Built, and Value. |

---

## 5. Data Strategy

### 5.1 Source
- Public permit records via [Bellingham PermitEyes](https://permiteyes.us/bellingham/publicview.php).

### 5.2 Processing Pipeline
The project uses a pre-processing step to ensure high performance:
1. **Extraction:** Scrapes records from the portal.
2. **Classification:** Heuristic keyword matching for `Solar`, `EV Charger`, and `Heat Pump`.
3. **Geocoding:** Addresses are matched against the US Census Bureau API.
4. **Serialization:** Outputs `js/permit-data.js` containing a structured JSON object.

---

## 6. Spatial & Property Intelligence (Phase 2)

### 6.1 Environmental Justice (EJ)
The dashboard uses **MassGIS EJ2020** polygons to identify underserved populations.
- **Automated Tagging:** Every permit is spatially joined to EJ polygons on-the-fly.
- **Equity Context:** Provides descriptions of qualification criteria (e.g., "Income and Minority").

### 6.2 Property Intel
Integrated **Bellingham Assessor Database (FY26)** to provide property-level context:
- **Year Built:** Correlation between structure age and clean energy adoption.
- **Use Class:** Differentiates between Single Family, Multi-Family, and Commercial.
- **Total Value:** Economic profile of adopters.

## 7. Roadmap & Next Steps

### 7.1 Enhancements
- [ ] **Advanced Clustering:** Implement Leaflet.markercluster for better visualization of high-density areas.
- [ ] **Growth Projections:** Basic linear regression for future adoption estimates.
- [ ] **Mobile App PWA:** Convert to a Progressive Web App for better field use.

### 7.2 Data Quality
- [ ] **Geocoding Refinement:** Implement a fallback for failed geocodes (e.g., matching to street centerlines).
- [ ] **Classification Logic Tuning:** Refine keyword list based on stakeholder feedback.

## 7. Limitations
- **Latency:** No real-time data; updates require running the PowerShell script.
- **Coverage:** Permit-based estimates may miss unregistered or "DIY" installations.
- **Accuracy:** Classification is heuristic; complex descriptions may lead to miscategorization.

---

## 8. Deliverables
- ✅ **Static Dashboard:** [Live on GitHub Pages](https://KezinB.github.io/Bellingham-Clean-Energy-Permit-Dashboard/)
- ✅ **Structured Dataset:** Embedded in `js/permit-data.js`.
- ✅ **Refresh Script:** `scripts/build_permit_dataset.ps1`.
- ✅ **Documentation:** `README.md` and `project.md`.

---

## 9. Strategic Direction
This tool serves as the foundation for **Urban Energy Intelligence**. It can evolve into a broader platform for policy validation, utility load planning, and carbon offset tracking at the municipal level.

---

## 10. Project History
- **2026-04-29:** Initial development complete. All core features (Map, Trends, Filters, Export) functional.
- **2026-05-03:** **Phase 2 Complete.** Integrated EJ Spatial Layers, Parcel Boundaries, and Assessor Metadata. Adjusted zoom visibility logic (+4 Zoom). Updated interactive map legend.


