# Project Plan: Clean Energy Adoption Dashboard

## Project Title

Web-Based Dashboard for Estimating Residential EV Chargers, Heat Pumps, and Solar Installations Using Permit Data

---

## 1. Objective

Develop a lightweight, web-accessible dashboard that visualizes neighborhood-level adoption of:

- EV Chargers
- Heat Pumps
- Solar Panels

The system uses public permit data as the primary source and is deployed as a static website so stakeholders can validate it remotely.

---

## 2. Key Goal

Reduce the need for manual in-person surveys by providing a digital estimation tool that is:

- Easy to access in a browser
- Fast to update
- Simple to validate remotely

---

## 3. Constraints and Design Decisions

### Constraints

- Development and client teams are in different countries
- No backend deployment is preferred initially
- The data source may not provide a public API

### Design Decisions

- Use a pure frontend stack: HTML, CSS, JavaScript
- Host via GitHub Pages
- Use preprocessed JSON or CSV instead of a live API dependency in the browser

---

## 4. System Overview

Permit Data Portal -> Data Cleaning -> Structured Dataset -> Static Dashboard -> Client Access

---

## 5. Data Strategy

### 5.1 Data Source

- Public permit records via PermitEyes

### 5.2 Data Extraction

- Manual export or scripted extraction from the portal
- Periodic updates on a weekly or monthly cadence

### 5.3 Data Processing

Performed before publishing to the dashboard:

- Remove irrelevant permits
- Normalize addresses
- Classify permits into solar, EV charger, and heat pump categories
- Convert the cleaned output into a browser-friendly dataset

### 5.4 Core Fields

- Address
- Permit category
- Date
- Status
- Description

---

## 6. Dashboard Features

### Current

- Overview metrics
- Category distribution
- Search and filter controls
- Recent permit table
- Map view for geocoded records

### Future

- Time-based trends
- Comparison views against survey results
- More advanced geographic summaries

---

## 7. User Flow

1. Open the dashboard link.
2. Review the latest processed permit snapshot.
3. Filter by category or search for a location.
4. Inspect matching permits in the table and map.

---

## 8. Deployment Plan

- Store the project in a GitHub repository
- Publish with GitHub Pages
- Regenerate the dataset when new permit data is available

---

## 9. Update Workflow

1. Pull new permit records from the source portal.
2. Run the preprocessing script.
3. Commit the refreshed dataset.
4. Publish the updated static site.

---

## 10. Validation Strategy

- Compare a sample neighborhood against field observations
- Measure missing installations and over-reporting
- Refine keyword classification rules over time

---

## 11. Limitations

- No real-time data feed
- Permit-based estimates can miss unregistered work
- Keyword classification is heuristic rather than authoritative
- Some addresses may not geocode cleanly

---

## 12. Advantages

- Fast deployment
- Low hosting cost
- Easy remote review
- No server maintenance

---

## 13. Deliverables

- Static dashboard
- Structured dataset
- Refresh script for future updates
- Basic documentation

---

## 14. Strategic Direction

This can evolve into a broader urban energy intelligence tool for policy, validation, and long-term planning.
