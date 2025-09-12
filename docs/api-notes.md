# Gravity Forms REST API v2 Implementation Notes

## Important API Behaviors

### Forms Endpoint (`/forms`)

According to the official Gravity Forms REST API v2 documentation:

1. **Response Format**: The `/forms` endpoint returns a **JSON object keyed by form ID**, not an array.
   
   Each form object includes:
   - `id`: The form ID (matches the object key)
   - `title`: The form title
   - `entries`: String count of total entries for this form
   
   Example response:
   ```json
   {
     "30": {
       "id": "30",
       "title": "API Documentation",
       "entries": "1"
     },
     "31": {
       "id": "31",
       "title": "Inquiry Form",
       "entries": "0"
     },
     "27": {
       "id": "27",
       "title": "Stripe 5.0 Testing",
       "entries": "13"
     }
   }
   ```

2. **Pagination Support**: 
   - **Documentation states**: The `/forms` endpoint does **NOT** support `page` or `per_page` parameters
   - **Testing shows**: Pagination parameters (`paging[page_size]`, `paging[current_page]`) are ignored
   - **Actual behavior**: Always returns all forms as an object keyed by form ID
   - **Note**: The `parse_entry_search_params` function in the PHP code is used by endpoints that support pagination (like `/entries`), not by `/forms`

3. **Supported Parameters**:
   - `include`: An array of form IDs to include in the response. When used, returns full form objects with all fields.
   
   Example: `/forms?include[]=31` returns the complete form object for form ID 31.

4. **Field Details**:
   - Without `include`: Returns minimal form info (id, title, entries count)
   - With `include`: Returns complete Form Object including fields, confirmations, notifications, etc.

### Entries Endpoint (`/entries`)

The entries endpoint DOES support pagination with `page` and `per_page` parameters, unlike the forms endpoint.

### Authentication

- Both OAuth 1.0a and Basic Authentication are supported
- Basic Auth requires HTTPS
- OAuth 1.0a is the recommended method per Gravity Forms documentation

### Field IDs

- All fields MUST have unique integer IDs
- Compound fields (like name, address) use decimal notation for sub-inputs (e.g., "1.3" for first name, "1.6" for last name)

## Testing Considerations

1. Some endpoints may not be available on all installations (e.g., validation endpoint)
2. Add-on specific endpoints (feeds) require the add-on to be installed
3. Results endpoint only works with Quiz/Poll/Survey forms
4. Field filters depend on form configuration

## Known Limitations

1. The forms listing endpoint returns ALL forms - no server-side filtering except by ID
2. Some API responses may vary based on WordPress filters and Gravity Forms version
3. The `entries` count in form listings can be disabled via the `gform_rest_api_retrieve_form_totals` filter