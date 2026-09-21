# Backend-Bestandsaufnahme

Nur lesend untersucht: `Stickadler/produktionsprogramm-v1`, Branch `main`, 20.09.2026.

## Reale Strukturen

- Benutzer liegen als Konfiguration in `form_settings.config.users`; die stabile interne ID ist `AppUser.id`.
- Mitarbeiter liegen in `form_settings.config.employees`; Todo-Zuweisungen speichern `assignedEmployeeId`.
- Das Backend löst die Mitarbeiter-ID über `employee.userId` zum Benutzer und dessen E-Mail auf.
- Todo-Fälligkeit wird als `dueDate` ohne willkürliche Standard-Uhrzeit gespeichert.
- Ohne Mitarbeiterzuweisung setzt das Backend den angemeldeten Benutzer als Eigentümer.
- Todos liegen in `todo_cards`, Bilder in `todo_images`; Notizen liegen in `notes`, Bilder in `note_images`.
- Bilddateien werden blockweise in den Cloudflare-Bucket geladen; in D1 stehen nur Metadaten und Objektschlüssel.

## Konsequenzen für Mobile

- Mobile speichert für Mitarbeiterzuweisungen die echte `assignedEmployeeId`.
- „Für mich“ benötigt keine erfundene ID im Client: Eine leere Mitarbeiter-ID verwendet serverseitig den angemeldeten Benutzer.
- Datum ohne Uhrzeit bleibt ein Datum; die frühere Annahme 17:00 wurde entfernt.
- Die Test-PWA kann eine optionale Uhrzeit erfassen. Das bestehende Produktions-Backend benötigt vor der dauerhaften Speicherung noch ein separates Uhrzeitfeld; `dueDate` wird nicht zweckentfremdet.
- Bilder werden erst nach dem erfolgreichen Anlegen des Todo-/Notiz-Datensatzes hochgeladen.
- Die separate Test-PWA bleibt im Entwurfsmodus, bis Authentifizierung und CORS ausdrücklich zur Integration freigegeben wurden.
