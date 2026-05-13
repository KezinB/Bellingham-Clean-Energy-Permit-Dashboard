# Changes Log

## 2026-05-13

- Fixed missing JavaScript handlers that were causing runtime errors:
  - Added CSV export support.
  - Added legend-based category toggling.
  - Restored detail panel close/reset behavior.
- Reworked duplicated date filter inputs in the UI:
  - Gave desktop and drawer date fields unique IDs.
  - Synced both date filter variants through shared JavaScript helpers.
- Pinned the `shpjs` dependency to version `6.2.0` instead of using `@latest`.
- Updated the parcel layer label in the filter drawer to match the actual zoom threshold used by the app.
- Verified the updated frontend script with `node --check js/app.js`.
