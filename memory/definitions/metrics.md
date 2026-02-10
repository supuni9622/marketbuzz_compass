# Metrics Definitions (Locked)

## Gross Billed Amount (BASELINE)
- Sum of all charge amounts where charge_month == M.
- Derived from charge_date month, not status. Used for growth targets.

## Collected Amount
- Sum where status_current in (COLLECTED, DEPOSITED). BILLED and ONHOLD are not collected.

## Refunded Amount
- Sum where status_current == REFUND (fallback: amount < 0).

## Comparison Rules
- MoM compare: previous month by default.
- YoY compare: same month last year if available.
