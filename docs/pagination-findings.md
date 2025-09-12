# Gravity Forms REST API Pagination Findings

## Summary

After extensive testing with the Gravity Forms REST API v2, we've confirmed the following behaviors regarding pagination:

## Forms Endpoint (`/forms`)

### Official Documentation
- States that the `/forms` endpoint does **NOT** support pagination parameters
- Returns all forms as a JSON object keyed by form ID

### Testing Results
✅ **Confirmed**: The `/forms` endpoint ignores all pagination parameters:
- `page` and `per_page` parameters are ignored
- `paging[page_size]` and `paging[current_page]` parameters are ignored
- Always returns ALL forms as an object keyed by form ID

### API Response Format
```json
{
  "1": { "id": "1", "title": "Form 1", "entries": "10" },
  "2": { "id": "2", "title": "Form 2", "entries": "5" },
  "3": { "id": "3", "title": "Form 3", "entries": "0" }
}
```

### Supported Parameters
✅ `include` - Array of form IDs to include (this works correctly)

## Entries Endpoint (`/entries`)

### Official Documentation
- States that the `/entries` endpoint DOES support pagination

### Testing Results
⚠️ **Partial Support**: Pagination parameters have mixed results:
- Traditional `page` and `per_page` parameters may work
- `paging` object with nested parameters (`page_size`, `current_page`) is accepted but may not always paginate correctly
- The API accepts the parameters but actual pagination behavior varies

### PHP Implementation Notes
The `parse_entry_search_params` function in the Gravity Forms PHP code shows:
- It expects `paging[page_size]` and `paging[current_page]` as nested parameters
- These are used for entries, feeds, and results endpoints
- The forms endpoint has different handling and doesn't use this function

## Implementation Recommendations

1. **Forms Listing**: 
   - Don't rely on pagination for forms
   - Use the `include` parameter to filter specific forms
   - Handle all forms being returned as an object

2. **Entries Listing**:
   - Support both parameter formats for flexibility
   - Test pagination with actual API instance before relying on it
   - Have fallback handling for when pagination doesn't work

3. **Client Implementation**:
   - The current implementation correctly JSON-stringifies complex parameters
   - Validation properly handles nested paging objects
   - Response handling accommodates both array and object formats

## Test Coverage

✅ Forms endpoint behavior verified
✅ Include parameter for forms working
✅ Entries endpoint accepts pagination parameters
⚠️ Actual pagination effectiveness varies by installation

## Conclusion

The Gravity Forms REST API v2 has inconsistent pagination support:
- Forms endpoint: No pagination (documented and confirmed)
- Entries endpoint: Pagination parameters accepted but behavior varies
- The API design returns forms as objects and entries as arrays
- Pagination is most reliable for entries, feeds, and results endpoints