import{describe,expect,it}from'vitest';
import{parseVoiceDecision}from'./voiceDecision';

describe('parseVoiceDecision',()=>{
  it.each(['speichern','bitte speichern','ja','Aufgabe anlegen','bestätigen'])('erkennt Speichern: %s',text=>expect(parseVoiceDecision(text)).toBe('save'));
  it.each(['verwerfen','bitte abbrechen','nein','nicht speichern','Aufgabe löschen'])('erkennt Verwerfen: %s',text=>expect(parseVoiceDecision(text)).toBe('discard'));
  it('rät bei unklarer Antwort nicht',()=>expect(parseVoiceDecision('vielleicht später')).toBe('unknown'));
});
