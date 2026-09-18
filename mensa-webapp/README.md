# Mensa Ostfalia Wolfenbüttel – Speiseplan

Kleine Flask-Webapp, die den Speiseplan der Mensa Ostfalia Wolfenbüttel über
die öffentliche Mensa-API des Studierendenwerks OstNiedersachsen abruft und
für die nächsten Tage übersichtlich in Tages-Tabs darstellt.

## Ausführen

```bash
pip install -r requirements.txt
python app.py
```

Anschließend im Browser [http://localhost:5000](http://localhost:5000) öffnen.

## Funktionsweise

- Ruft `https://sls.api.stw-on.de/v1/locations/130/menu/<start>/<ende>` für
  die kommenden 7 Kalendertage ab (Standort 130 = Mensa Wolfenbüttel).
- Gruppiert die Gerichte je Tag nach Kategorie (Essen 1/2/3, Gemüse, Beilage,
  Dessert).
- Zeigt Preis (Studierende), Symbole für Ernährungsart (🌱 vegetarisch, 🌿
  vegan, 🐟 Fisch, 🍗 Geflügel, 🐄 Rind, 🐖 Schwein, 🌍 Klimaessen u.a.) sowie
  Allergene/Zusatzstoffe (ausklappbar) an.
- Antworten der API werden 10 Minuten im Arbeitsspeicher zwischengespeichert,
  um die Anzahl der Anfragen gering zu halten.

## Hinweis

Die Daten stammen von einer öffentlich erreichbaren, aber inoffiziellen API
(`api.stw-on.de`) des Studierendenwerks OstNiedersachsen und können sich
ändern.
