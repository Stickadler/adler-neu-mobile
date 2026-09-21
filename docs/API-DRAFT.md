# Tatsächlicher Adler-Neu-API-Vertrag

Stand: `Stickadler/produktionsprogramm-v1`, Branch `main`, geprüft am 20.09.2026.

- `GET /api/auth/me` – angemeldeter Benutzer; liefert Name und E-Mail, derzeit aber keine stabile Benutzer-ID.
- `GET /api/form-config` – enthält unter anderem `config.employees` mit stabiler Mitarbeiter-ID, Name, Aktivstatus und optionaler Benutzerverknüpfung.
- `POST /api/todos` – legt ein Todo mit `title`, `description`, `columnId`, `dueDate` und `assignedEmployeeId` an. Der Mobile-Client führt zusätzlich eine optionale `dueTime`; das bestehende Produktions-Backend speichert dieses Feld noch nicht dauerhaft.
- `POST /api/notes` – legt eine Notiz mit `title`, `description`, `category` und `data` an.
- `POST /api/todos/:id/images` und `POST /api/notes/:id/images` – mehrteiliger Bild-Upload nach dem Anlegen des Eintrags.

Der Mobile-Client verwendet diese bestehenden Verträge. Es gibt keine generischen Endpunkte `/api/v1/employees`, `/api/v1/attachments` oder `/api/v1/pinboard/notes`.

## Bilder

Ein Todo beziehungsweise eine Notiz wird zuerst angelegt. Danach werden Bilder in Blöcken bis 800 KiB übertragen und mit einer Abschlussanfrage zusammengesetzt. Die Datenbank speichert nur Metadaten und den R2-Objektschlüssel; die Bilddaten liegen im Bucket.

## Noch offene Integrationsgrenze

Die produktive Anmeldung nutzt ein HttpOnly-Cookie mit `SameSite=Lax`. Eine separat auf GitHub Pages gehostete PWA kann dieses Cookie bei Cross-Origin-API-Aufrufen nicht zuverlässig verwenden. Vor produktiver Anbindung ist deshalb eine freigegebene, hostingunabhängige Authentifizierungs- und CORS-Lösung oder eine Bereitstellung unter derselben Site erforderlich.

Für die produktive Übernahme der optionalen Uhrzeit benötigt das Todo-Datenmodell außerdem ein eigenes Uhrzeitfeld. Bis dahin ist die Uhrzeit in der Test-PWA erfassbar und änderbar, wird aber vom unveränderten Produktions-Backend nicht persistiert.
