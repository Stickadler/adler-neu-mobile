export type VoiceDecision='save'|'discard'|'unknown';

export function parseVoiceDecision(text:string):VoiceDecision{
  const normalized=text.toLowerCase().trim();
  if(/\b(nicht speichern|verwerfen|verwerfe|abbrechen|abbruch|löschen|nein)\b/.test(normalized))return'discard';
  if(/\b(speichern|speichere|bestätigen|bestätige|anlegen|ja)\b/.test(normalized))return'save';
  return'unknown'
}
