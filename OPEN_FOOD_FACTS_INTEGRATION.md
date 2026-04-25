# Open Food Facts Integration

## Overview

This document describes the integration of Open Food Facts (OFF) as an **explicit secondary search mode** in the Asciende nutrition module. OFF is used ONLY when the user explicitly activates it via a button, providing access to commercial and processed foods.

## Architecture

### Design Principles

1. **Non-destructive**: OFF integration does not modify existing nutrition logic, meal plans, or validation rules
2. **Explicit activation**: OFF search is NEVER automatic; users must explicitly click "Search in Open Food Facts"
3. **Cache-on-select**: Only selected OFF products are saved to the local database
4. **Transparent sourcing**: OFF results are clearly labeled as "Commercial / External Products"
5. **Clean default experience**: Default search shows only internal foods (Asciende/USDA) for educational clarity
6. **Server-side processing**: OFF requests processed through backend function
7. **Broad product range**: OFF includes commercial, processed, and packaged foods when explicitly enabled

### Flow Diagram

```
User searches for food
    ↓
Search local database (foods table) ONLY
    ↓
Display internal results (Asciende/USDA)
    ↓
User explicitly clicks "Search in Open Food Facts" button
    ↓
Call Supabase Edge Function: search-off-foods
    ↓
Edge Function queries OFF API (server-side)
    ↓
Edge Function validates results:
    - Must have valid product name
    - Must have at least one non-zero macronutrient
    - Maximum 10 results returned
    ↓
Display OFF results in separate section:
    - Header: "Open Food Facts (Commercial / External Products)"
    - Disclaimer about commercial/processed foods
    - ODbL attribution
    ↓
User selects OFF product
    ↓
Normalize data to 100g base
    ↓
Save to local foods table
    ↓
Mark as source='OFF', is_verified=false
    ↓
Available for future use without API call
```

### Two-Step Search Flow

#### Step 1: Default Internal Search
- **Automatic**: Triggered on every keystroke (with debounce)
- **Source**: Only Asciende and USDA foods
- **Purpose**: Educational, clean nutrition database
- **Result display**: "Available in Asciende" section

#### Step 2: Explicit OFF Search
- **Manual**: Triggered ONLY when user clicks button
- **Source**: Open Food Facts API (commercial products)
- **Purpose**: Access to packaged/commercial foods
- **Result display**: "Open Food Facts (Commercial / External Products)" section
- **Disclaimer**: Clear labeling that includes processed/commercial foods

### Validation Rules

OFF results are validated for basic quality:

#### Required Data
- Valid product name (non-empty)
- At least one non-zero macronutrient (calories, protein, carbs, or fat)

#### Result Limits
- Maximum 10 products per query
- Results returned as-is from OFF (no category filtering)

#### NOT Filtered
- OFF search accepts all product categories
- Commercial foods, processed foods, beverages are all included
- NOVA score is not used to filter results
- Brand products and packaged foods are welcome

## Database Changes

### Migration: `add_open_food_facts_integration`

Added fields to `foods` table:

| Column | Type | Description |
|--------|------|-------------|
| `source` | TEXT | Food origin: 'internal', 'usda', 'OFF' |
| `off_product_id` | TEXT | Open Food Facts barcode identifier |
| `off_last_sync` | TIMESTAMPTZ | When OFF data was last cached locally |
| `is_verified` | BOOLEAN | Trainer/Admin verification flag (defaults to false for OFF) |

### Migration: `update_foods_source_constraint`

Updated source constraint:
- Added 'OFF' as valid source value (short form for Open Food Facts)
- Maintains backward compatibility with 'open_food_facts'
- Migrated existing 'open_food_facts' values to 'OFF'

### Constraints

- `source` must be one of: 'internal', 'usda', 'open_food_facts', 'OFF'
- `off_product_id` has unique constraint (prevent duplicates)
- Indexed on `off_product_id` and `source` for fast lookups

### Existing Data

- USDA foods automatically updated to `source='usda'`
- Internal foods remain as `source='internal'`
- OFF foods marked as `source='OFF'`

## API Integration

### Edge Function: `search-off-foods`

**Purpose**: Server-side proxy for OFF API with basic validation

**Location**: `supabase/functions/search-off-foods/index.ts`

**Key Features**:
- Server-side execution (protects API calls)
- Basic nutrition validation (requires valid name + macros)
- Result limiting (maximum 10 products)
- CORS enabled for frontend access
- No category filtering (accepts all food types)

**Endpoint**:
```
GET {SUPABASE_URL}/functions/v1/search-off-foods
```

**Query Parameters**:
- `query` (required): Search term (minimum 2 characters)
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Results per page (default: 20, max: 50)

**Response Format**:
```json
{
  "products": [...],
  "count": 10,
  "page": 1,
  "page_size": 10,
  "total_results_before_filter": 47
}
```

**Validation Logic**:
1. Fetch products from OFF API
2. Validate product has non-empty name
3. Validate at least one macronutrient > 0
4. Limit to 10 results
5. Return all valid products (no category exclusions)

### Client: `openFoodFactsClient.ts`

#### Functions

**`fetchOpenFoodFacts(query, page, pageSize)`**

Calls the edge function (not OFF API directly):
- Routes through Supabase edge function
- Authorization header with anon key
- 15-second timeout
- Error handling with silent fallback
- Returns pre-filtered core foods only

**`fetchOpenFoodFactsProduct(barcode)`**

Fetches specific product by barcode for detailed info (direct OFF API call).

#### Original OFF API Endpoints

- Search: `https://world.openfoodfacts.org/cgi/search.pl`
- Product: `https://world.openfoodfacts.org/api/v2/product/{barcode}`

#### Headers

```
User-Agent: Asciende - Nutrition Management Platform - contact@asciende.app
```

### Normalization: `openFoodFactsNormalizer.ts`

#### Purpose

Converts OFF product data to Asciende's standardized format.

#### Normalization Rules

1. **Base unit**: All values converted to 100g
2. **Macronutrients**: Always included (kcal, protein, carbs, fat)
3. **Micronutrients**: Optional (fiber, sugar, sodium, vitamins, minerals)
4. **Sodium conversion**: If only salt available, calculate sodium (salt / 2.5)
5. **Unit conversion**:
   - Sodium: g → mg (×1000)
   - Minerals: g → mg (×1000)
   - Vitamins: g → μg (×1000000)

#### Data Quality

Products without complete macronutrient data are rejected.

#### Function: `saveOFFProductToDatabase(supabase, normalizedData)`

- Checks for existing OFF product (prevents duplicates)
- Saves normalized data to `foods` table with `source='OFF'`
- Returns saved food ID or null on error
- Marks product as `is_verified=false` by default

## UI Components

### 1. `FoodSearchWithOFF.tsx`

**Purpose**: Two-mode food search component with explicit OFF activation

**Features**:
- Real-time internal search with 500ms debounce
- Explicit OFF toggle button
- Visual differentiation of sources
- Clear labeling of external/commercial products
- Automatic caching on selection

**Search Modes**:

**Mode 1: Internal Search (Default)**
```typescript
const filteredLocalFoods = localFoods.filter((food) => {
  // Search only internal foods
  return matchesSearch && matchesCategory;
});
```

**Mode 2: OFF Search (Explicit)**
```typescript
const handleToggleOFFSearch = () => {
  const newState = !offSearchEnabled;
  setOffSearchEnabled(newState);

  if (newState && searchTerm.length >= 2) {
    searchOFF(searchTerm);
  }
};
```

**OFF Product Addition**:
```typescript
const handleSelectOFFProduct = async (product) => {
  const normalized = normalizeOpenFoodFactsData(product);
  const saved = await saveOFFProductToDatabase(supabase, normalized);
  // Refresh local foods list and add to selection
};
```

**UI Elements**:
- **Search input**: Searches internal database continuously
- **OFF toggle button**: Activates/deactivates OFF search
  - Inactive state: Gray, text "Search in Open Food Facts"
  - Active state: Orange, text "Hide Open Food Facts"
- **Results sections**:
  - "Available in Asciende" (internal foods)
  - "Open Food Facts (Commercial / External Products)" (when enabled)
- **Disclaimer**: Visible when OFF is enabled explaining commercial/processed nature

### 2. `FoodSourceBadge.tsx`

**Purpose**: Visual indicator of food data source.

**Props**:
```typescript
interface FoodSourceBadgeProps {
  source?: string;
  isVerified?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}
```

**Badge Styles**:
- **internal**: Blue badge "Asciende" with Database icon
- **usda**: Green badge "USDA" with Database icon
- **OFF**: Orange badge "OFF" with ExternalLink icon
- **OFF Verified**: Orange badge "OFF ✓" with check mark

**Usage**:
```tsx
<FoodSourceBadge
  source="OFF"
  isVerified={false}
  size="sm"
/>
```

## User Experience

### Default Search Behavior

1. User types in search box
2. Local database (Asciende/USDA) searched immediately
3. Results display in "Available in Asciende" section
4. Clean, educational experience with curated foods

### Explicit OFF Search

1. User clicks "Search in Open Food Facts" button
2. Button changes to orange, text changes to "Hide Open Food Facts"
3. OFF API queried with same search term (after 500ms debounce)
4. Results appear in separate section below internal foods
5. Section header: "Open Food Facts (Commercial / External Products)"
6. Disclaimer visible: "OFF products include commercial and processed foods"

### Result Display

**Internal Foods Section** (Always visible):
- Header: "Available in Asciende"
- Database icon
- Shows USDA or OFF badge if previously cached
- Blue/green color scheme

**OFF Section** (Only when explicitly enabled):
- Header: "Open Food Facts (Commercial / External Products)"
- External link icon
- Orange color scheme
- Disclaimer about commercial/processed nature
- ODbL attribution
- Shows loading state during API call

### Selection Flow

1. User clicks OFF product (from external section)
2. Data normalized and saved automatically to local database
3. Food immediately available with `source='OFF'`
4. No user confirmation needed
5. Future searches find it in internal results section
6. Badge shows "OFF" to indicate external origin

## Legal Compliance

### Attribution

Added to About page:

```
Food data provided by Open Food Facts (ODbL).
```

### License

Open Food Facts data is licensed under Open Database License (ODbL).

### Requirements Met

- ✅ Attribution provided
- ✅ No modification of source data
- ✅ No redistribution without credit
- ✅ User-agent identifies application

## Security & Performance

### Performance Optimizations

1. **Debounced search**: 500ms delay prevents excessive API calls
2. **Conditional trigger**: OFF only searched if local results insufficient
3. **Field selection**: Minimal API payload
4. **Result caching**: Selected products saved locally
5. **Index optimization**: Fast duplicate detection

### Security Measures

1. **Read-only API**: No authentication required, public data
2. **Timeout protection**: 10-second limit prevents hanging
3. **Error handling**: Silent fallback to local results
4. **Input sanitization**: Query trimmed and validated
5. **RLS preserved**: OFF foods follow same access rules

### Rate Limiting

No explicit rate limit enforced by OFF API, but:
- Debouncing reduces request frequency
- Only triggered on insufficient local results
- User-agent identification for fair use

## Future Enhancements

### Planned

1. **Verification workflow**: Admin interface to verify OFF foods
2. **Update mechanism**: Refresh OFF data periodically
3. **Barcode scanner**: Mobile camera integration
4. **Localization**: Support multiple languages beyond Spanish
5. **Favorites**: User-specific food bookmarks

### Not Planned

- ❌ Mass import of OFF database
- ❌ Automatic synchronization
- ❌ Direct user editing of OFF data
- ❌ OFF-specific analytics

## Testing Checklist

### Functional Tests

- [ ] Default search: Only internal foods displayed
- [ ] OFF button not clicked: No OFF search triggered
- [ ] OFF button clicked: OFF search triggered immediately
- [ ] OFF button clicked twice: OFF results hidden
- [ ] Edge function returns max 10 results
- [ ] Edge function accepts all product categories
- [ ] Edge function validates product name exists
- [ ] Edge function validates at least one macro > 0
- [ ] Select OFF product: Saved to database with `source='OFF'`
- [ ] Select same OFF product twice: No duplicate created
- [ ] OFF API timeout: Graceful fallback, no error shown
- [ ] OFF API error: Silent handling, no user disruption
- [ ] OFF disabled then enabled: Results refresh correctly

### UI Tests

- [ ] Local foods show "Available in Asciende" section header
- [ ] OFF toggle button displays correctly (gray when inactive)
- [ ] OFF toggle button changes to orange when active
- [ ] OFF section header: "Open Food Facts (Commercial / External Products)"
- [ ] OFF disclaimer visible when section displayed
- [ ] Source badges display correctly (color, icon)
- [ ] Verified badge shows for verified OFF foods
- [ ] Loading state displays during OFF search
- [ ] Empty state displays when no OFF results
- [ ] OFF section hidden when toggle deactivated

### Data Tests

- [ ] Macronutrients normalized to 100g base
- [ ] Sodium converted from salt if needed
- [ ] Micronutrient units converted correctly
- [ ] Products without macros rejected
- [ ] Brand name preserved
- [ ] Product name preserved

### Legal Tests

- [ ] Attribution visible on About page
- [ ] User-agent header included in requests
- [ ] ODbL license mentioned

## Troubleshooting

### OFF Search Not Triggered

**Symptoms**: No OFF results even with < 5 local results

**Solutions**:
1. Check query length (must be ≥ 3 characters)
2. Verify network connectivity
3. Check browser console for API errors
4. Confirm API endpoint accessibility

### Duplicate Products

**Symptoms**: Multiple entries for same OFF product

**Solutions**:
1. Check `off_product_id` constraint exists
2. Verify normalization creates consistent IDs
3. Database migration applied correctly

### Missing Nutrition Data

**Symptoms**: OFF products show 0 values

**Solutions**:
1. Check OFF API response structure
2. Verify normalization field mapping
3. Confirm product has complete data in OFF

### API Timeout

**Symptoms**: Long wait times, no results

**Solutions**:
1. Check network speed
2. Verify timeout setting (10s default)
3. Consider increasing timeout for slow connections

## Support

For issues with OFF integration:
1. Check API status: https://status.openfoodfacts.org
2. Review browser console logs
3. Verify migration applied: `SELECT source, COUNT(*) FROM foods GROUP BY source`
4. Contact: contact@asciende.app

## References

- [Open Food Facts API Documentation](https://openfoodfacts.github.io/api-documentation/)
- [Open Database License](https://opendatacommons.org/licenses/odbl/)
- [OFF Product Search](https://world.openfoodfacts.org/cgi/search.pl)
