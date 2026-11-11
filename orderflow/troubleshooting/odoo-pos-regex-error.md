# Odoo POS Regex Error in get_table_draft_orders

## Error
```
AttributeError: 'NoneType' object has no attribute 'group'
File "/usr/lib/python3/dist-packages/odoo/addons/pos_restaurant/models/pos_order.py", line 167, in get_table_draft_orders
    order["uid"] = search(r"\d{5,}-\d{3,}-\d{4,}", order["pos_reference"] or "").group(0) if order["pos_reference"] else None
```

## Root Cause
The Odoo `pos_restaurant` addon expects `pos_reference` to match the regex pattern `\d{5,}-\d{3,}-\d{4,}` (e.g., `12345-678-9012`).

However, the OrderFlow → Odoo sync (via `pos_omniflow_sync` addon) creates orders with `pos_reference` in format:
```
OmniFlow-{external_order_ref[-6:]}
```

Example: `OmniFlow-a1b2c3` - This does NOT match the expected regex pattern, causing `re.search()` to return `None`, and then `.group(0)` fails with `AttributeError`.

## Impact
- Odoo POS UI fails to load table orders
- Error occurs repeatedly when accessing POS interface
- Blocks waiters from using Odoo POS for tables synced from OrderFlow

## Solution Options

### Option 1: Update OrderFlow sync to use compatible format (Recommended)
Modify `pos_omniflow_sync/controllers/main.py` to generate `pos_reference` matching Odoo's expected pattern:
```python
# Instead of:
'pos_reference': f"OmniFlow-{external_order_ref[-6:]}" if external_order_ref else False,

# Use a format that matches \d{5,}-\d{3,}-\d{4,}:
import re
order_num = external_order_ref.replace('-', '')[:12] if external_order_ref else '000000000000'
# Format: 5+ digits - 3+ digits - 4+ digits
pos_reference = f"{order_num[:5]}-{order_num[5:8]}-{order_num[8:12]}"
```

### Option 2: Patch Odoo pos_restaurant addon
Override `get_table_draft_orders` in a custom addon to handle the OmniFlow format:
```python
def get_table_draft_orders(self):
    # ... existing code ...
    for order in orders:
        pos_ref = order["pos_reference"] or ""
        # Try OmniFlow format first
        match = search(r"OmniFlow-([a-f0-9]{6,})", pos_ref)
        if match:
            order["uid"] = match.group(1)
        else:
            # Fallback to original pattern
            match = search(r"\d{5,}-\d{3,}-\d{4,}", pos_ref)
            order["uid"] = match.group(0) if match else None
```

## Related Files
- `/opt/odoo-addons/pos_omniflow_sync/controllers/main.py` - OrderFlow sync controller
- Odoo core: `pos_restaurant/models/pos_order.py` line 167

## Status
- **Identified**: 2026-10-15
- **✅ Resolved**: 2026-10-23 (v1.41.3) — implementado en `pos_omniflow_sync` v14.0.1.2.0
  con campo propio `pos.order.omniflow_order_ref` y `pos_reference` en formato
  `Order 00000-000-0000`.
- **Detalle completo**: [`197-odoo-pos-reference-incompatible-caja.md`](197-odoo-pos-reference-incompatible-caja.md)
- **Recurrencia:** sí, el 2026-10-23 se reprodujo en producción porque el fix nunca se
  había implementado en el addon.