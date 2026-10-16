import {describe,it,expect} from 'vitest';
import {newProfile,applyActions,initialWorld,makeResponse,Proposal} from '../shared/engine';
import {applyPlay,imagineFallback,updateDiscoveries} from '../shared/play';
import {classify} from '../server/trained-intents';
import evaluation from '../training/evaluation.json';
describe('interactive 3D game state',()=>{
 it('petting builds a friendship discovery without fabricating speech practice',()=>{const {profile,reply}=applyPlay(newProfile(),{kind:'pet'});expect(profile.play?.pats).toBe(1);expect(profile.play?.discoveries).toContain('friend');expect(profile.history).toEqual([]);expect(profile.skills).toEqual({});expect(reply).toContain('গা সুড়সুড়');});
 it('ground taps move the actual pet coordinates',()=>{const p=applyPlay(newProfile(),{kind:'move',x:3,z:2}).profile;expect(p.world.coordinates).toEqual([3,2]);expect(p.history).toHaveLength(0);});
 it('rejects out-of-bounds movement',()=>{expect(()=>applyPlay(newProfile(),{kind:'move',x:7,z:0})).toThrow();expect(()=>applyPlay(newProfile(),{kind:'move',x:6,z:6})).toThrow();});
 it('a thrown ball produces a real animation event',()=>{const p=applyPlay(newProfile(),{kind:'spawn',item:'ball'}).profile;const result=applyPlay(p,{kind:'item',item:'ball'});expect(result.profile.world.events).toContain('ball_play');});
 it('feeding the dragon consumes an existing mango and earns kindness',()=>{const p=newProfile();p.world.characters=['dragon'];p.world.objects=['mango'];const r=applyPlay(p,{kind:'item',item:'mango'});expect(r.profile.world.objects).not.toContain('mango');expect(r.profile.world.events).toContain('dragon_fed');expect(r.profile.play?.discoveries).toContain('kindness');});
 it('cannot feed or interact with an absent item',()=>{expect(()=>applyPlay(newProfile(),{kind:'item',item:'mango'})).toThrow();});
 it('help activities complete through touch without claiming language improvement',()=>{const p=newProfile();p.world.scene='help';p.world.objects=['boat'];const r=applyPlay(p,{kind:'item',item:'boat'});expect(r.profile.world.coordinates).toEqual([4,1.5]);expect(r.profile.completed).toHaveLength(1);expect(r.profile.skills).toEqual({});});
 it('creates bounded, labelled pretend props for unexpected ideas',()=>{const actions=imagineFallback('a city made of chocolate');const w=applyActions(initialWorld(),actions);expect(w.imaginations?.[0]).toMatchObject({shape:'house',name:'a city made of chocolate'});expect(w.objects).toEqual([]);expect(makeResponse('a city made of chocolate',w,actions,newProfile())).toContain('কল্পনার জিনিস');});
 it('does not spawn distress, greetings or unsafe requests as toys',()=>{expect(imagineFallback('hello')).toEqual([]);expect(imagineFallback('I feel sad')).toEqual([]);expect(imagineFallback('a gun')).toEqual([]);});
 it('does not turn feelings into pretend props, even in Bangla',()=>{expect(imagineFallback('আমার মন একটু খারাপ')).toEqual([]);expect(imagineFallback('আমার খুব কষ্ট লাগছে')).toEqual([]);});
 it('does not allow unbounded or executable imagination definitions',()=>{expect(Proposal.safeParse({actions:[{type:'imagine',value:{name:'test',shape:'execute',color:'blue'}}]}).success).toBe(false);expect(Proposal.safeParse({actions:[{type:'imagine',value:{name:'x'.repeat(61),shape:'toy',color:'blue'}}]}).success).toBe(false);});
 it('caps imagined props to six without discarding the existing scene',()=>{let w=initialWorld();for(let i=0;i<8;i++)w=applyActions(w,imagineFallback('new magic creation '+i));expect(w.imaginations).toHaveLength(6);expect(w.scene).toBe('meadow');});
 it('keeps sticker discoveries unique',()=>{let p=applyPlay(newProfile(),{kind:'pet'}).profile;p=applyPlay(p,{kind:'pet'}).profile;updateDiscoveries(p);expect(p.play?.discoveries).toEqual(['friend']);expect(p.play?.pats).toBe(2);});
});
describe('genuinely fitted portable classifier',()=>{
 it.each(evaluation.examples)('matches held-out Python model inference: $input',row=>{const r=classify(row.input);expect(r.label).toBe(row.predicted);expect(r.probability).toBeCloseTo(row.probability,3);});
 it('actually proposes a supported action for an unseen paraphrase',()=>{expect(classify('a place where guests can eat their dinner').action).toEqual({type:'scene',value:'restaurant'});});
 it('declines uncertain predictions instead of pretending certainty',()=>{expect(classify('xxzqv plfn').action).toBe(null);expect(classify('I am buying dinner today').action).toBe(null);});
});
