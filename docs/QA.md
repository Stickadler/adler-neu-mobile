# QA – Mobile v0

Automatisiert getestet werden Sprachparser und Mitarbeiterauflösung. Zusätzlich vor Freigabe auf mindestens Android/Chrome und iPhone/Safari manuell prüfen:

- Mikrofon erlaubt / verweigert / keine Sprache erkannt
- Schnelle Aufgabe mit Datum und Uhrzeit
- reine „Notiz“ verlangt Zielauswahl
- Pinnwandnotiz ohne Rückfrage
- eindeutiger und mehrdeutiger Mitarbeitername
- ein und mehrere Bilder, Bild wieder entfernen
- API offline, Uploadfehler und Speicherfehler
- erfolgreiche Speicherung mit akustischer Bestätigung
- Installation auf Homescreen und Neustart als Standalone-PWA

Hinweis: Web Speech Recognition ist browserabhängig. Die Oberfläche muss bei fehlender Unterstützung verständlich reagieren; für eine spätere robuste plattformübergreifende Lösung kann serverseitige Speech-to-Text ergänzt werden.
