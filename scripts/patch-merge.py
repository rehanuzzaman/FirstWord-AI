p = "server/index.ts"
s = open(p, encoding="utf8").read()
old = "          actions = g.actions;\n          cloudReply = g.reply;\n          cloudProvider = \"groq\";"
assert old in s, "groq block not found"
s = s.replace(old, (
    "          // Model actions win; if it only spoke, keep the parser's clear game actions.\n"
    "          if (g.actions.length) actions = g.actions;\n"
    "          cloudReply = g.reply;\n"
    "          cloudProvider = \"groq\";"
), 1)
open(p, "w", encoding="utf8").write(s)

p = "server/roleplay.ts"
s = open(p, encoding="utf8").read()
anchor = "- শিশু যা বলে তা গল্পে মেনে নাও."
assert anchor in s
s = s.replace(anchor, "- শিশুর সাথে সহজ 'তুমি' করে কথা বলো; 'আপনি', 'চান', 'নেওয়া হল' এর মতো আনুষ্ঠানিক শব্দ এড়াও।\n" + anchor, 1)
open(p, "w", encoding="utf8").write(s)

p = "scripts/roleplay-eval.ts"
s = open(p, encoding="utf8").read()
s = s.replace('import { applyActions, initialWorld, type World } from "../shared/engine.js";',
              'import { applyActions, initialWorld, parseIntent, type World } from "../shared/engine.js";', 1)
old = "        actions = r.actions as typeof actions;"
assert old in s
s = s.replace(old, (
    "        actions = r.actions as typeof actions;\n"
    "        // Same merge rule as the server: fall back to the parser's clear actions.\n"
    "        if (!actions.length) actions = parseIntent(step.child, world) as typeof actions;"
), 1)
open(p, "w", encoding="utf8").write(s)
print("merged")
