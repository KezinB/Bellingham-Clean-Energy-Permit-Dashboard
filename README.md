# Bellingham Clean Energy Permit Dashboard

A web-based, static dashboard designed to track and visualize neighborhood-level adoption of residential clean energy technologies in Bellingham, Massachusetts. 

The dashboard provides estimates for:
- **Solar Installations**
- **EV Chargers**
- **Heat Pumps**

The dashboard also provides **Spatial Intelligence** layers:
- **Environmental Justice (EJ) Areas**: Identifies adoption trends in historically underserved neighborhoods.
- **Property Parcels**: High-resolution boundaries for verification (Zoom +4).
- **Assessor Data**: Building age, property type, and assessed value context.

Live Demo: [View Dashboard](https://KezinB.github.io/Bellingham-Clean-Energy-Permit-Dashboard/) *(Note: Requires GitHub Pages to be enabled)*

---

## Objective
This project reduces the need for manual, in-person surveys by providing a digital estimation tool based on public permit data. It is deployed as a static, lightweight frontend application that allows stakeholders to remotely validate residential clean energy adoption rates.

## Architecture & Tech Stack
This project follows a "serverless" static approach to minimize hosting costs and complexity:
- **Frontend:** Vanilla HTML5, CSS3 (Custom Light Theme + Glassmorphism), and JavaScript.
- **Mapping:** [Leaflet.js](https://leafletjs.com/) with CartoDB Positron base tiles.
- **Data Pipeline:** A custom PowerShell script (`scripts/build_permit_dataset.ps1`) that automatically scrapes, processes, and geocodes permit records from the PermitEyes public portal.
- **Hosting:** GitHub Pages.

## How It Works

The workflow consists of two main parts:
1. **Data Preprocessing (PowerShell):** 
   The script fetches raw records from the Bellingham permit portal, applies keyword-based heuristics to classify permits into Solar, EV, or Heat Pump categories, geocodes the addresses via the US Census Bureau API, and outputs a structured JavaScript file (`js/permit-data.js`).
2. **Dashboard Visualization (Web):** 
   The static web app loads the pre-processed dataset directly into the browser. It features interactive filtering, responsive summary metrics, a searchable data table, and dynamic map clustering.

3. **Spatial Intelligence (Phase 2):**
   The dashboard dynamically loads **Environmental Justice (EJ)** polygons and **Tax Parcel** boundaries. It uses `turf.js` and `shpjs` to perform client-side spatial joins, tagging every permit with its equity context and linking it to **Assessor Metadata** (Property Type, Year Built, etc.).

## Local Development & Updating Data

Because the dashboard is entirely static, there is no build step for the frontend. You can simply open `index.html` in any modern web browser to view the dashboard locally.

### Updating the Permit Dataset
When you need to refresh the dashboard with the latest permits from the town portal:

1. Open PowerShell on a Windows machine.
2. Navigate to the project root directory.
3. Run the data pipeline script:
   ```powershell
   .\scripts\build_permit_dataset.ps1
   ```
4. The script will fetch the latest data, geocode new addresses, and automatically overwrite the `js/permit-data.js` file.
5. Commit the changes and push to the `main` branch to update the live GitHub Pages site.

## Limitations & Validation
- **Heuristic Classification:** Permits are classified based on descriptions (e.g., searching for "solar", "photovoltaic", "evse"). This may miss ambiguously worded permits or capture false positives.
- **Geocoding:** Some unstructured addresses may fail to geocode via the US Census API and will fall back to the town center.
- **Permits vs. Installations:** A pulled permit indicates *intent* to install, but does not guarantee the project was completed.

## License
This project is provided for research and validation purposes. Data is sourced from public municipal records.
