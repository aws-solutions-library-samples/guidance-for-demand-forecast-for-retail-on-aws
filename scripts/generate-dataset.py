#!/usr/bin/env python3
"""Generate synthetic retail demand dataset with future rows for what-if inference."""

import argparse
import csv
import math
import random
from datetime import datetime, timedelta

random.seed(42)

PRODUCTS = [
    {"id": "wireless-earbuds", "name": "Wireless Earbuds Pro", "type": "Audio", "base_price": 79.99, "base_demand": 145},
    {"id": "smart-watch", "name": "Smart Watch Ultra", "type": "Wearables", "base_price": 249.99, "base_demand": 62},
    {"id": "bluetooth-speaker", "name": "Portable Bluetooth Speaker", "type": "Audio", "base_price": 49.99, "base_demand": 180},
    {"id": "noise-cancelling-headphones", "name": "Noise Cancelling Headphones", "type": "Audio", "base_price": 199.99, "base_demand": 85},
    {"id": "4k-webcam", "name": "4K Webcam", "type": "Accessories", "base_price": 89.99, "base_demand": 110},
    {"id": "mechanical-keyboard", "name": "Mechanical Keyboard RGB", "type": "Peripherals", "base_price": 129.99, "base_demand": 95},
    {"id": "gaming-mouse", "name": "Wireless Gaming Mouse", "type": "Peripherals", "base_price": 69.99, "base_demand": 130},
    {"id": "usb-c-hub", "name": "USB-C Hub 7-in-1", "type": "Accessories", "base_price": 39.99, "base_demand": 200},
    {"id": "portable-ssd", "name": "Portable SSD 1TB", "type": "Storage", "base_price": 89.99, "base_demand": 105},
    {"id": "smart-display", "name": "Smart Home Display", "type": "Smart Home", "base_price": 149.99, "base_demand": 70},
    {"id": "robot-vacuum", "name": "Robot Vacuum", "type": "Smart Home", "base_price": 299.99, "base_demand": 45},
    {"id": "action-camera", "name": "Action Camera 4K", "type": "Camera", "base_price": 179.99, "base_demand": 55},
]

STORE_ID = "store_001"
FORECAST_HORIZON = 14
HISTORY_YEARS = 2


def _subtract_years(date, years):
    """Subtract whole years from a date, handling Feb 29 by clamping to Feb 28."""
    try:
        return date.replace(year=date.year - years)
    except ValueError:
        # date is Feb 29 and the target year is not a leap year
        return date.replace(year=date.year - years, day=28)


def _parse_end_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'. Expected format YYYY-MM-DD."
        )


parser = argparse.ArgumentParser(
    description="Generate synthetic retail demand dataset with future rows for what-if inference."
)
parser.add_argument(
    "--end-date",
    type=_parse_end_date,
    default=datetime.now().replace(hour=0, minute=0, second=0, microsecond=0),
    help="Last date of historical data (YYYY-MM-DD). Defaults to today. "
    f"Start date is always {HISTORY_YEARS} years before this, and the forecast "
    f"horizon adds {FORECAST_HORIZON} future days after it.",
)
args = parser.parse_args()

END_DATE = args.end_date
START_DATE = _subtract_years(END_DATE, HISTORY_YEARS)

def seasonal_factor(day_of_year, product_type):
    base = 1.0
    base += 0.15 * math.sin(2 * math.pi * (day_of_year - 80) / 365)
    month = (day_of_year // 30) + 1
    if month == 11:
        base *= 1.6
    elif month == 12:
        base *= 2.0
    elif month in (6, 7):
        base *= 1.2
    if product_type in ("Audio", "Wearables", "Smart Home") and month == 12:
        base *= 1.3
    if product_type == "Camera" and month in (6, 7, 8):
        base *= 1.4
    return base

def day_of_week_factor(weekday):
    factors = [0.85, 0.80, 0.90, 0.95, 1.15, 1.25, 1.10]
    return factors[weekday]

def price_variation(base_price, day_of_year):
    price = base_price
    month = (day_of_year // 30) + 1
    if month == 11:
        price *= 0.70
    elif month == 7:
        price *= 0.80
    elif month in (1, 2):
        price *= 1.15
    price *= random.uniform(0.90, 1.10)
    return round(price, 2)

def price_elasticity(price, base_price):
    ratio = price / base_price
    return max(0.5, 2.0 - ratio)

rows = []
current = START_DATE
while current <= END_DATE:
    day_of_year = current.timetuple().tm_yday
    weekday = current.weekday()
    for product in PRODUCTS:
        season = seasonal_factor(day_of_year, product["type"])
        dow = day_of_week_factor(weekday)
        noise = random.gauss(1.0, 0.12)
        trend = 1.0 + 0.0003 * (current - START_DATE).days
        price = price_variation(product["base_price"], day_of_year)
        elasticity = price_elasticity(price, product["base_price"])
        demand = product["base_demand"] * season * dow * noise * trend * elasticity
        demand = max(1, round(demand, 2))
        rows.append({
            "item_id": product["id"],
            "store_id": STORE_ID,
            "ts": current.strftime("%Y-%m-%d 00:00:00"),
            "demand": demand,
            "price": price,
        })
    current += timedelta(days=1)

# Add future rows with empty demand for each product (required for real-time what-if)
for i in range(1, FORECAST_HORIZON + 1):
    future_date = END_DATE + timedelta(days=i)
    for product in PRODUCTS:
        rows.append({
            "item_id": product["id"],
            "store_id": STORE_ID,
            "ts": future_date.strftime("%Y-%m-%d 00:00:00"),
            "demand": "",
            "price": product["base_price"],
        })

with open("assets/data/consumer_electronics.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["item_id", "store_id", "ts", "demand", "price"])
    writer.writeheader()
    writer.writerows(rows)

historical = sum(1 for r in rows if r["demand"] != "")
future = sum(1 for r in rows if r["demand"] == "")
print(f"Generated {len(rows)} rows ({historical} historical + {future} future)")
print(f"Date range: {START_DATE.date()} to {(END_DATE + timedelta(days=FORECAST_HORIZON)).date()}")
print(f"File: assets/data/consumer_electronics.csv")
