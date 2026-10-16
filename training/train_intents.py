"""Train a small real intent classifier on ORIGINAL, synthetic adult-authored examples.
Not an LLM, not a clinical model, not child data. No conversational logs are read.
Exports portable TF-IDF/logistic-regression weights used by the TypeScript server.
"""
from pathlib import Path
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

ROOT=Path(__file__).resolve().parent
BASE={
 'scene:restaurant':['open a restaurant','start a cafe','serve meals to hungry guests','a place for eating food','cook dinner for customers','let us sell lunch','make a diner','set up a food stall','রেস্তোরাঁ খুলি','খাবারের দোকান বানাই','অতিথিদের খাবার দেব','রান্না করে সবাইকে খাওয়াব','দুপুরের খাবার বিক্রি করি','খাবার খাওয়ার জায়গা বানাই'],
 'scene:shop':['open a shop','make a market','sell things to people','start a store','set up our stall','a place to buy things','বাজারে যাই','জিনিস বিক্রি করি','দোকান খুলি','কেনাকাটা করতে যাব','সবাই আমার কাছ থেকে কিনবে','একটি দোকান বানাই'],
 'scene:castle':['build a castle','make a kingdom','create a palace','a royal home','somewhere for a king to live','a fortress with towers','প্রাসাদ বানাই','রাজার বাড়ি তৈরি করি','আমাদের রাজ্য বানাও','দুর্গে যাব','রানির জন্য বাড়ি','অনেক মিনারওয়ালা বাড়ি'],
 'scene:moon':['go to the moon','fly to outer space','visit another planet','travel among the stars','a lunar adventure','be an astronaut in space','চাঁদে যাব','মহাকাশে উড়ে যাই','গ্রহে বেড়াতে যাব','তারার দেশে যাব','চন্দ্র অভিযান করি','নভোচারী হব'],
 'scene:help':['help my pet','Mithu needs help','get across the river','find a way to the other side','help our friend reach the flowers','solve our river problem','মিঠুকে সাহায্য করি','নদী পার হতে হবে','ওপারে যাওয়ার উপায়','বন্ধুকে পার করে দিই','ফুলবাগানে যেতে সাহায্য','সাহায্যের খেলা খেলি'],
 'scene:stage':['put on a show','make a stage','perform for friends','tell a story to the audience','act in a play','start a performance','মঞ্চে যাব','গল্প শোনাব সবাইকে','অভিনয় করব','নাটক বানাই','বন্ধুদের জন্য অনুষ্ঠান','গল্প বলার মঞ্চ'],
 'role:shopkeeper':['I will be the seller','let me serve the customers','I want to be the shopkeeper','my turn to sell','I will run the store','আমি বিক্রি করব','আমি দোকানদার হব','আমি ক্রেতাদের জিনিস দেব','দোকান আমি চালাব','এবার আমার বিক্রির পালা'],
 'role:customer':['I will be a customer','let me buy things','my turn to order','I am the buyer','আমি কিনব','আমি ক্রেতা হব','আমি অর্ডার দেব','এবার আমি খাবার কিনি'],
 'role:king':['I want to be the king','make me the ruler','I am the king now','give me the royal crown','আমি রাজা হব','আমি শাসক হব','আমাকে মুকুট দাও','এই রাজ্যের রাজা আমি'],
 'object:bridge':['build a bridge','a crossing over the water','join the river banks','put planks across the river','make a wooden crossing','সেতু বানাই','নদীর উপর কাঠ বসাও','একটি ব্রিজ তৈরি','দুই পাড় জুড়ে দাও','কাঠ দিয়ে পার হওয়ার পথ'],
 'object:boat':['bring a boat','sail across the river','row to the other side','use a little canoe','নৌকা নিয়ে আসো','নৌকায় পার হই','বৈঠা বেয়ে যাব','ছোট ডিঙি বানাও'],
 'character:dragon':['bring a friendly dragon','a dragon friend joins us','add a dragon to the story','we need a gentle dragon','একটা ড্রাগন আনো','বন্ধু ড্রাগন আসুক','গল্পে ড্রাগন চাই','মজার ড্রাগন বানাও'],
 'object:mango':['I want a mango','bring mangoes','some sweet mango fruit','give me a ripe mango','আম খেতে চাই','একটা পাকা আম দাও','মিষ্টি আম নিয়ে আসো','আম চাই'],
 'object:rice':['I want rice','a bowl of rice please','bring some rice','serve rice for lunch','ভাত দাও','আমি ভাত খাব','এক বাটি ভাত চাই','দুপুরে ভাত খাব'],
 'object:fish':['I want fish','serve a fish','some fish for lunch','bring a little fish','মাছ খাব','মাছ দাও','একটা মাছ চাই','দুপুরে মাছ চাই'],
 'none':['hello there','I feel happy','I feel sad','how are you','what is your name','I like you','I want something new','that is funny','I changed my mind','হ্যালো বন্ধু','আমার মন খারাপ','কেমন আছ','তোমার নাম কী','তোমাকে ভালো লাগে','নতুন কিছু চাই','মজা লাগছে','এই তো'],
}
# Authored held-out paraphrases are never included in training.
HOLDOUT=[('a place where guests can eat their dinner','scene:restaurant'),('সবাইকে রান্না করে খেতে দেব','scene:restaurant'),('I would like to buy things from our store','scene:shop'),('make somewhere for the queen to live','scene:castle'),('let us travel to another planet','scene:moon'),('help him reach the opposite river bank','scene:help'),('it is time to perform for everyone','scene:stage'),('let me be the person selling things','role:shopkeeper'),('I am buying dinner today','role:customer'),('I should wear the royal crown','role:king'),('connect both sides with wooden planks','object:bridge'),('we can row across','object:boat'),('আমাদের গল্পে একটা ভালো ড্রাগন আসুক','character:dragon'),('একটা মিষ্টি পাকা আম চাই','object:mango'),('may I have a bowl of rice','object:rice'),('some fish please','object:fish'),('তুমি কেমন আছ বন্ধু','none'),('I feel a bit sad today','none')]
texts=[];targets=[];rows=[]
for target,examples in BASE.items():
 for text in examples:
  # Adult-authored text augmentation only; not additional real observations.
  bangla=any('\u0980'<=c<='\u09ff' for c in text)
  variants=[text,('চলো ' if bangla else 'please ')+text,('আমরা ' if bangla else 'can we ')+text, text+(' বন্ধু' if bangla else ' with my friend')]
  for variant in variants:texts.append(variant);targets.append(target);rows.append({'text':variant,'target':target,'source':'authored-synthetic'})
vectorizer=TfidfVectorizer(analyzer='char',ngram_range=(2,4),sublinear_tf=True)
X=vectorizer.fit_transform(texts)
model=LogisticRegression(C=8,max_iter=600,random_state=7).fit(X,targets)
probs=model.predict_proba(vectorizer.transform([x for x,_ in HOLDOUT]));pred=model.classes_[probs.argmax(axis=1)]
report={'model':'character TF-IDF + multinomial logistic regression','training_rows':len(texts),'classes':len(model.classes_),'held_out_rows':len(HOLDOUT),'accuracy':float(accuracy_score([y for _,y in HOLDOUT],pred)),'scope':'Small authored benchmark only. Not general language understanding or child-speech validation.','examples':[{'input':text,'expected':expected,'predicted':str(p),'probability':round(float(max(pr)),4)} for (text,expected),p,pr in zip(HOLDOUT,pred,probs)]}
weights={'version':1,'classes':model.classes_.tolist(),'vocabulary':{k:int(v) for k,v in vectorizer.vocabulary_.items()},'idf':vectorizer.idf_.round(6).tolist(),'coefficients':model.coef_.round(6).tolist(),'intercepts':model.intercept_.round(6).tolist(),'ngram':[2,4],'threshold':0.58,'source':'Original synthetic examples; no child data'}
(ROOT/'intent-model.json').write_text(json.dumps(weights,separators=(',',':')),encoding='utf8')
(ROOT/'dataset.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
(ROOT/'evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='examples'},indent=2))
