# API Entwurf v0

Basis: /api/v1

- GET /me – aktuell angemeldeter Benutzer und stabile Benutzer-ID
- GET /employees?active=true – aktive Mitarbeiter
- POST /attachments – multipart/form-data, liefert { id }
- POST /todos
- POST /pinboard/notes
- POST /speech/interpret – optional für spätere serverseitige Interpretation

## Eintrag
```json
{
  "title": "Rechnung Müller prüfen",
  "description": "Belege kontrollieren",
  "due_at": "2026-09-22T14:00:00",
  "assigned_user_ids": ["employee-id"],
  "attachment_ids": ["attachment-id"]
}
```

Die Mobile-App speichert Mitarbeiter niemals nur anhand des Anzeigenamens. Namen werden gegen GET /employees aufgelöst; gespeichert wird die stabile ID. Mehrdeutige Namen müssen vor dem Speichern aufgelöst werden.

Anhänge werden zuerst hochgeladen. Die gelieferten Attachment-IDs werden anschließend am Todo bzw. Pinnwand-Eintrag gespeichert. Große Binärdaten gehören nicht direkt in die Todo-Tabelle.

Authentifizierung und Serverimplementierung bleiben unabhängig vom Hosting-Anbieter.
