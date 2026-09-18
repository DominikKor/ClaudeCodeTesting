"""Kleine Webapp, die den Speiseplan der Mensa Ostfalia Wolfenbüttel abruft
und für die nächsten Tage übersichtlich darstellt.

Datenquelle: öffentliche Mensa-API des Studierendenwerks OstNiedersachsen
(https://sls.api.stw-on.de/v1).
"""
from __future__ import annotations

import time
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from flask import Flask, render_template

app = Flask(__name__)

API_BASE = "https://sls.api.stw-on.de/v1"
CANTEEN_ID = 130  # Mensa Wolfenbüttel (Ostfalia)
TIMEZONE = ZoneInfo("Europe/Berlin")
DAYS_AHEAD = 7  # Kalendertage, die abgefragt werden
CACHE_TTL_SECONDS = 10 * 60

LANE_ORDER = ["Essen 1", "Essen 2", "Essen 3", "Gemüse", "Beilage", "Dessert"]

CATEGORY_ICONS = {
    "VEGA": "🌿",  # vegan
    "VEGT": "🌱",  # vegetarisch
    "FISH": "🐟",
    "GEFL": "🍗",  # Geflügel
    "RIND": "🐄",
    "SCHW": "🐖",
    "KLMA": "🌍",  # Klimaessen
    "AT": "❤️",  # artgerechte Tierhaltung
    "NM": "🥔",  # Niedersachsen Menü
    "NEU": "✨",
    "SECC": "♻️",  # Second Chance
}

WEEKDAYS_DE = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
]

_cache: dict[str, tuple[float, dict]] = {}


def fetch_menu(start: date, end: date) -> dict:
    """Ruft den Speiseplan für den angegebenen Zeitraum ab (mit kurzem Cache)."""
    cache_key = f"{start.isoformat()}_{end.isoformat()}"
    now = time.monotonic()

    cached = _cache.get(cache_key)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    url = f"{API_BASE}/locations/{CANTEEN_ID}/menu/{start.isoformat()}/{end.isoformat()}"
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()

    _cache[cache_key] = (now, data)
    return data


def lane_sort_key(lane_name: str) -> tuple[int, str]:
    try:
        return (LANE_ORDER.index(lane_name), lane_name)
    except ValueError:
        return (len(LANE_ORDER), lane_name)


def build_days(raw_meals: list[dict], today: date) -> list[dict]:
    """Gruppiert die rohen Gerichte nach Tag und Essens-Kategorie (Lane)."""
    by_date: dict[str, dict] = {}

    for meal in raw_meals:
        meal_date = meal["date"]
        day = by_date.setdefault(meal_date, {})
        lane_name = meal["lane"]["name"]
        lane = day.setdefault(lane_name, [])

        categories = meal["tags"]["categories"]
        icons = [CATEGORY_ICONS[c["id"]] for c in categories if c["id"] in CATEGORY_ICONS]
        allergens = [a["name"] for a in meal["tags"]["allergens"]]

        lane.append(
            {
                "name": meal["name"],
                "price_student": meal["price"]["student"],
                "price_guest": meal["price"]["guest"],
                "icons": icons,
                "categories": [c["name"] for c in categories],
                "allergens": allergens,
            }
        )

    days = []
    for meal_date in sorted(by_date):
        d = date.fromisoformat(meal_date)
        lanes = [
            {"name": lane_name, "meals": meals}
            for lane_name, meals in sorted(by_date[meal_date].items(), key=lambda kv: lane_sort_key(kv[0]))
        ]
        days.append(
            {
                "date": meal_date,
                "weekday": WEEKDAYS_DE[d.weekday()],
                "date_display": d.strftime("%d.%m.%Y"),
                "is_today": d == today,
                "lanes": lanes,
            }
        )
    return days


@app.route("/")
def index():
    start = datetime.now(TIMEZONE).date()
    end = start + timedelta(days=DAYS_AHEAD)

    error = None
    days = []
    try:
        data = fetch_menu(start, end)
        days = build_days(data.get("meals", []), today=start)
    except requests.RequestException as exc:
        error = f"Der Speiseplan konnte nicht geladen werden: {exc}"

    return render_template(
        "index.html",
        days=days,
        error=error,
        canteen_name="Mensa Ostfalia Wolfenbüttel",
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
