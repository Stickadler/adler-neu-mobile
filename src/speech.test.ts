import{afterEach,beforeEach,describe,expect,it,vi}from'vitest';
import{listenOnce}from'./speech';

class FakeRecognition{
  static instances:FakeRecognition[]=[];
  lang='';continuous=false;interimResults=false;maxAlternatives=0;
  onresult:(event:any)=>void=()=>{};
  onend:()=>void=()=>{};
  onerror:(event:any)=>void=()=>{};
  starts=0;stops=0;
  constructor(){FakeRecognition.instances.push(this)}
  start(){this.starts++}
  stop(){this.stops++}
}

describe('listenOnce',()=>{
  beforeEach(()=>{
    vi.useFakeTimers();
    FakeRecognition.instances=[];
    vi.stubGlobal('window',{SpeechRecognition:FakeRecognition,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout});
  });
  afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});

  it('wartet nach der letzten Sprache fünf Sekunden',async()=>{
    let settled=false;
    const promise=listenOnce().then(result=>{settled=true;return result});
    const recognition=FakeRecognition.instances[0];
    recognition.onresult({results:[{0:{transcript:'Material für Müller bestellen'}}]});
    await vi.advanceTimersByTimeAsync(4999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toEqual({text:'Material für Müller bestellen'});
  });

  it('übernimmt mehrere Sprachabschnitte nach automatischem Erkennungsende',async()=>{
    const promise=listenOnce();
    const recognition=FakeRecognition.instances[0];
    recognition.onresult({results:[{0:{transcript:'Material für Müller'}}]});
    recognition.onend();
    await vi.advanceTimersByTimeAsync(200);
    expect(recognition.starts).toBe(2);
    recognition.onresult({results:[{0:{transcript:'bis Freitag bestellen'}}]});
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toEqual({text:'Material für Müller bis Freitag bestellen'});
  });

  it('lässt sich über ein Signal sofort abbrechen',async()=>{
    const controller=new AbortController();
    const promise=listenOnce({signal:controller.signal});
    controller.abort();
    await expect(promise).rejects.toMatchObject({name:'AbortError'});
    expect(FakeRecognition.instances[0].stops).toBe(1);
  });

  it('wartet standardmäßig bis zu 30 Sekunden auf Sprache',async()=>{
    const promise=listenOnce();
    await vi.advanceTimersByTimeAsync(29999);
    let settled=false;
    promise.finally(()=>{settled=true}).catch(()=>{});
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).rejects.toThrow('Keine Sprache erkannt');
  });
});
