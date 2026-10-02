# Recommended bid
- Google query requests Last Sale Price first, then Address/County and other existing fields, using Square Footage; no explanations. No bracket formula sent to Google.
- Recommended bid = interior square feet × selected dollars-per-square-foot rate, rounded to cents.
- Settings > Bid Rules supports unlimited add/edit/remove rows, positive price ceilings and rates, rejects duplicate ceilings and invalid input before applying. No invented initial thresholds.
- Lowest ceiling >= last sale price wins, irrespective of entry order. Above highest threshold gives no match, no implicit rate.
- Rules persist in existing workspace settings JSON; latest imported fields persist via property-info flow. Bid is derived on record render and import preview, and recalculates after rules change/reload. It is a recommendation, not a quote mutation.
- Recommended bid badge immediately follows stage badge. Missing/ambiguous data, no rules and no match explain why no bid is shown.
- Preserve original Google text and assessor flow. Never use estimated/assessed value as sale price. No schema or RLS changes.
