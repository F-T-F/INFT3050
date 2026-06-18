# QA Test Checklist — Entertainment Guild Web App

> Owner: Fan Xinming (QA / PM) · Status: **in progress**
> Purpose: manual test checklist for the prototype so we can verify the main
> user workflows before each SCRUM demo.

## How to use
- Run the frontend (`my-shop`) and backend (`nocodb-server`) locally.
- Go through each case below and mark Pass / Fail / N/A.
- Log any failure in the "Bugs found" table at the bottom with a screenshot.

## 1. Home page
- [ ] Page loads without console errors
- [ ] Featured products are displayed
- [ ] Clicking a product / "Browse" navigates to the product list
- [ ] Header search box redirects to `/products?q=...`

## 2. Search Results page (`/products`)
- [ ] Product list loads from the backend
- [ ] Keyword search filters the results
- [ ] Category checkboxes filter correctly and show counts
- [ ] Price min/max filter + Apply works
- [ ] Sort by price (low->high / high->low) works
- [ ] Pagination changes pages and resets on new filter
- [ ] "No results found" state shows when nothing matches

## 3. Product detail (modal)
- [ ] "View Details" opens the modal with correct product data
- [ ] Modal closes correctly

## 4. Pages still to be built (track for future sprints)
- [ ] Shopping Cart page
- [ ] Create Account page
- [ ] User Profile page
- [ ] Admin Login page
- [ ] Admin Item Management (CRUD) pages

## 5. Backend / API
- [ ] `getProducts` returns data from NocoDB
- [ ] API errors are handled gracefully (no white screen)
- [ ] (future) registration / cart / order / auth / admin CRUD endpoints

## 6. Accessibility / responsive (spot check)
- [ ] Pages usable on mobile width
- [ ] Form fields have labels
- [ ] Pagination has aria labels

---

## Bugs found
| # | Page | Description | Severity | Screenshot | Status |
|---|------|-------------|----------|-----------|--------|
|   |      |             |          |           |        |
