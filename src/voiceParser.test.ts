import{describe,expect,it,vi}from'vitest';import{parseVoice}from'./voiceParser';

describe('parseVoice',()=>{
  it('erkennt Todo mit Datum und Uhrzeit',()=>{vi.setSystemTime(new Date('2026-09-20T10:00:00'));const result=parseVoice('Aufgabe Rechnung Müller prüfen, fällig morgen um 14 Uhr');expect(result.kind).toBe('todo');expect(result.dueDate).toBe('2026-09-21');expect(result.dueTime).toBe('14:00')});
  it('erkennt eine gesprochene volle Uhrzeit auch ohne um',()=>{const result=parseVoice('Aufgabe Rechnung prüfen morgen 14 Uhr');expect(result.dueTime).toBe('14:00');expect(result.title).toBe('Rechnung prüfen')});
  it('fragt bei normaler Notiz nach Ziel',()=>{const result=parseVoice('Notiz Material bestellen');expect(result.kind).toBeNull();expect(result.needsDestinationChoice).toBe(true)});
  it('erkennt Pinnwandnotiz',()=>{expect(parseVoice('Pinnwandnotiz Maschine prüfen').kind).toBe('pinboard')});
  it.each([['in 2 Wochen','2026-10-04'],['in zwei Wochen','2026-10-04'],['in 3 Tagen','2026-09-23'],['in drei Tagen','2026-09-23'],['heute','2026-09-20']])('erkennt relatives Datum %s',(spoken,expected)=>{vi.setSystemTime(new Date('2026-09-20T10:00:00'));expect(parseVoice(`Aufgabe Test fällig ${spoken}`).dueDate).toBe(expected)});
  it('erkennt Mitarbeiter und entfernt die Phrase aus dem Titel',()=>{const result=parseVoice('Aufgabe für Daniel: Material bestellen');expect(result.assigneeName).toBe('Daniel');expect(result.title).toBe('Material bestellen')});
  it('erkennt vollständige Mitarbeiternamen',()=>{const result=parseVoice('Daniel Müller soll die Beschädigung an der Tür prüfen');expect(result.assigneeName).toBe('Daniel Müller');expect(result.title).toBe('die Beschädigung an der Tür prüfen')});
  it('erkennt Zuweisung am Satzende',()=>{const result=parseVoice('Aufgabe Material bestellen Daniel zuweisen');expect(result.assigneeName).toBe('Daniel');expect(result.title).toBe('Material bestellen')});
  it('erkennt Zuweisung an den eingeloggten Benutzer',()=>{const result=parseVoice('Aufgabe Rechnung prüfen für mich');expect(result.assignToSelf).toBe(true);expect(result.title).toBe('Rechnung prüfen')});
});
