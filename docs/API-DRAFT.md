# API Entwurf v0

Basis: /api/v1

- GET /me
- GET /employees?active=true
- POST /todos
- POST /pinboard/notes
- POST /attachments
- POST /speech/interpret

Todo-Felder: title, description, due_at, assigned_user_ids, attachment_ids.

Authentifizierung und konkrete Serverimplementierung werden unabhängig vom Hosting-Anbieter gehalten.
