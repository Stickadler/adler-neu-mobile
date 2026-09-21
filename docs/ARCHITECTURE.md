# Adler Neu Mobile – Architektur

Installierbare PWA für Android, iPhone und iPad. Die App kommuniziert ausschließlich mit einer Adler-Neu-API. Der Datenspeicher kann später auf Synology, anderer NAS oder externem Hosting laufen.

## Sprachregeln v1
- Aufgabe / Todo / Erinnerung → Todo.
- Notiz ohne Ziel → Rückfrage Todo oder Pinnwand.
- Pinnwandnotiz / Notiz für die Pinnwand → Pinnwand.
- Natürliche Fälligkeiten werden interpretiert und vor Speicherung bestätigt.
- Mitarbeiter werden über stabile IDs zugewiesen; Namen dienen nur zur Erkennung/Anzeige.
- Mehrdeutige Mitarbeiternamen erfordern eine Rückfrage.
- Bilder sind Anhänge und werden nicht als Datenbank-BLOB im Todo gespeichert.

## API-Grenze
Mobile Client → HTTPS Adler API → Auth/Business Logic → Datenbank + Dateispeicher.

Geplante Module: Todo, Pinnwand/Notizen, Aufträge, Kalender, Kunden, Anhänge, Mitarbeiter.
