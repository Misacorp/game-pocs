import type { DialogueDef } from '../../types';

/**
 * STORY NPC DIALOGUE TREES. Quest offer/progress/complete text is shown automatically by the UI
 * (see DESIGN.md §12) — these trees are the extra conversation: lore, backstory, faction talk,
 * and (for Jory) the moral choice mechanic itself. Every option leads somewhere (`next`) or ends.
 */
export const STORY_DIALOGUES: DialogueDef[] = [
  {
    id: 'dlg_pell',
    start: 'start',
    nodes: {
      start: {
        text:
          "Old Pell squints up at the sky like he's reading it. \"Ah, good, good — you're back. Or new. Hard to tell some days, everyone looks the same size from a porch this low.\"",
        options: [
          { text: 'Tell me about the whales.', next: 'whales' },
          {
            text: 'What do you make of the tremors?',
            conditions: [{ type: 'quest', questId: 'mq_02_tremors', state: ['active', 'ready', 'completed'] }],
            next: 'tremors',
          },
          { text: 'Any advice for someone starting out?', next: 'advice' },
          {
            text: 'Got anything for an old friend?',
            conditions: [
              { type: 'quest', questId: 'mq_02_tremors', state: 'completed' },
              { type: 'flag', flag: 'gift_pell', not: true },
            ],
            actions: [{ type: 'giveItem', itemId: 'use_hp_potion_m', qty: 1 }, { type: 'setFlag', flag: 'gift_pell', value: true }],
            next: 'gift',
          },
          { text: 'Safe travels, Pell.' },
        ],
      },
      whales: {
        text:
          "\"Skywhales, they're called properly, though everyone just says 'whales' and the skywhales don't seem to mind. Oma's the oldest we know of — been drifting since before Driftmoor had a name, carrying us all on her back like it's nothing at all.\"",
        options: [
          { text: 'How do you know so much about her?', next: 'whales2' },
          { text: 'Thanks, Pell.' },
        ],
      },
      whales2: {
        text:
          "\"Spent forty years watching her from this very porch, spyglass in hand. You learn a whale's moods the way you learn an old friend's — the little shifts nobody else notices. Which is exactly why these tremors have me up at night.\"",
      },
      tremors: {
        text:
          "Pell's cheerful face goes serious, just for a moment. \"Forty years, and I've never felt her shake like this. Old whales get tired, sure, slow down some. This is different. This feels like pain.\"",
      },
      advice: {
        text:
          "\"Keep your boots laced and your potions stocked, and don't go swinging at anything twice your size till you've got the measure of it. Oh, and be kind to Maren — she's got the weight of the whole harbor on her, whether she admits it or not.\"",
      },
      gift: {
        text: "Pell presses a small vial into your hand before you can protest. \"Every new hand in Driftmoor gets one of these from me. Tradition. Don't argue with an old man's tradition.\"",
      },
    },
  },

  {
    id: 'dlg_maren',
    start: 'start',
    nodes: {
      start: {
        text: 'Maren looks up from her ledger, sharp-eyed as ever. "What do you need?"',
        options: [
          { text: "How's the harbor holding up?", next: 'harbor' },
          {
            text: "Do you really think Oma's dying?",
            conditions: [{ type: 'quest', questId: 'mq_05_king_barnacle', state: ['ready', 'completed'] }],
            next: 'worry',
          },
          { text: 'What was it like, choosing to run this harbor?', next: 'backstory' },
          {
            text: 'How are you, after everything?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'harvest' }],
            next: 'ending_harvest',
          },
          {
            text: 'How are you, after everything?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'purify' }],
            next: 'ending_purify',
          },
          {
            text: 'How are you, after everything?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'song' }],
            next: 'ending_song',
          },
          { text: 'Just checking in.' },
        ],
      },
      harbor: {
        text: '"Holding. Barely, some days. Ships come in lighter than they used to, and the crews look twitchier. But she\'s still afloat, and so are we."',
      },
      worry: {
        text:
          "Maren's hands go still over the ledger. \"...Yeah. I think she might be. I try not to say it out loud much. Doesn't help anyone, saying it. But you asked, so — yeah. I'm scared for her.\"",
      },
      backstory: {
        text:
          '"Inherited it, mostly. My mother ran this harbor, and her mother before that. Didn\'t so much choose it as fail to leave. Turns out I\'m good at it, though. Turns out I love it, too, storm-tossed nonsense and all."',
      },
      ending_harvest: {
        text:
          "Maren studies you for a long moment. \"Grell's way, then. Can't say I'd have chosen it myself, but... Oma's alive, isn't she. That's not nothing. I hope it was worth what it cost.\"",
      },
      ending_purify: {
        text:
          "Maren's shoulders ease, just slightly. \"Aolani always did believe healing was possible if you were patient enough. Glad someone finally proved her right. Thank you — for choosing the slow, hard way.\"",
      },
      ending_song: {
        text:
          "Maren just looks at you for a long moment, something unguarded in her face. \"A whale and a rider, singing the same song... I didn't think that ending existed until you made it. Well done. Truly.\"",
      },
    },
  },

  {
    id: 'dlg_grell',
    start: 'start',
    nodes: {
      start: {
        text: 'Harpoonmaster Grell looks you over like she\'s assessing cargo. "You looking for work, or just looking?"',
        options: [
          { text: "Tell me about the Harpooners' Guild.", next: 'guild' },
          { text: "What do you really think will happen to Oma?", next: 'oma_view' },
          {
            text: 'For the Guild!',
            conditions: [{ type: 'flag', flag: 'faction', value: 'harpooners' }],
            actions: [{ type: 'reputation', faction: 'harpooners', amount: 10 }],
            next: 'guild_cheer',
          },
          { text: 'Just passing through.' },
        ],
      },
      guild: {
        text:
          "\"We're the ones who keep this harbor running when sentiment won't cut it. Oma's sick, maybe dying — someone has to be ready to cut out the rot and steer this whale by force if she can't do it herself. That's us.\"",
        options: [
          { text: "Isn't that a bit... harsh?", next: 'guild_harsh' },
          { text: 'Understood.' },
        ],
      },
      guild_harsh: {
        text: "\"Harsh keeps people alive. I've buried Guild members who hesitated. I don't plan on burying more.\"",
      },
      oma_view: {
        text: "\"I think she's dying slow, and slow deaths make people comfortable with doing nothing. I don't intend to be comfortable.\"",
      },
      guild_cheer: {
        text: 'Grell allows herself the ghost of a smile. "Good. Keep that fire. Guild needs it."',
      },
    },
  },

  {
    id: 'dlg_aolani',
    start: 'start',
    nodes: {
      start: {
        text: 'Songkeeper Aolani\'s voice is quiet, but somehow carries over the whole harbor noise. "Peace to you, traveler. What brings you to my corner of the docks?"',
        options: [
          { text: 'Tell me about the Tidekeepers.', next: 'tidekeepers' },
          { text: 'Do you think Oma can really be healed?', next: 'heal_view' },
          { text: 'Could you ease my aches?', actions: [{ type: 'heal' }], next: 'heal_flavor' },
          {
            text: 'For the Tidekeepers.',
            conditions: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }],
            actions: [{ type: 'reputation', faction: 'tidekeepers', amount: 10 }],
            next: 'tide_cheer',
          },
          { text: 'Thank you, Songkeeper.' },
        ],
      },
      tidekeepers: {
        text:
          '"We believe Oma is not cargo to be steered but a soul to be heard. The Blight is a wound, and wounds heal, given patience and song. Force only ever deepens a wound like that."',
        options: [
          { text: "And if patience isn't fast enough?", next: 'tide_patience' },
          { text: 'I understand.' },
        ],
      },
      tide_patience: {
        text: '"Then we will have failed with clean hands instead of succeeded with bloody ones. I know how that sounds. I still believe it matters."',
      },
      heal_view: {
        text: '"I have to believe it. The alternative is a whale-sized grave for everyone I have ever loved. Belief, in that light, is simply practical."',
      },
      heal_flavor: {
        text: 'Aolani hums a low, warm note, and the ache in your shoulders eases like sun through fog. "Small mercies, freely given. Go gently."',
      },
      tide_cheer: {
        text: 'Aolani smiles, warm as harbor lanternlight. "May the currents carry you kindly."',
      },
    },
  },

  {
    id: 'dlg_idris',
    start: 'start',
    nodes: {
      start: {
        text:
          "Idris doesn't look up from a book balanced dangerously on a stack of other books. \"Oh — hello. Sorry, one moment — there. What can I do for you?\"",
        options: [
          { text: 'What exactly is the Blight?', next: 'blight' },
          { text: "What's your theory about Oma's Ember?", next: 'ember' },
          { text: 'Any regrets, choosing scholarship over adventure?', next: 'regrets' },
          { text: 'Just visiting.' },
        ],
      },
      blight: {
        text:
          "\"Best guess — and it is a guess, don't quote me — it's necrotic energy spreading from some old, unhealed wound deep in her. The purple color, the warmth, the way it spreads through living tissue like ink through water. Wounds fester. This is festering on a scale we've never studied.\"",
        options: [
          { text: 'What could cause a wound that deep?', next: 'blight2' },
          { text: 'Fascinating. Thank you.' },
        ],
      },
      blight2: {
        text:
          "\"Something with intent, I'd wager. Whales don't simply injure their own hearts by accident. Someone, or something, did this to her, a very long time ago. I intend to find out who.\"",
      },
      ember: {
        text:
          "\"The Ember is, near as anyone can tell, the source of everything that keeps a skywhale aloft and alive — heat, will, maybe even something like a soul. Harvest it wrong and you might kill her outright. Heal it wrong and the Blight could simply return. Delicate work, either way.\"",
      },
      regrets: {
        text: '"Constantly. And then I find something like a blighted core and remember exactly why I chose books over boredom. No regrets today, at least."',
      },
    },
  },

  {
    id: 'dlg_fenna',
    start: 'start',
    nodes: {
      start: {
        text:
          "Kelp Warden Fenna leans on her staff, watching you with the patience of someone who's outlasted worse than you. \"Forest's not going to protect itself. What do you need?\"",
        options: [
          { text: 'How long have you watched over Kelpwood?', next: 'history' },
          {
            text: 'What happened to Jory, in the end?',
            conditions: [{ type: 'quest', questId: 'mq_09_poacher_camp', state: 'completed' }, { type: 'flag', flag: 'jory', value: 'spared' }],
            next: 'jory_spared',
          },
          {
            text: 'What happened to Jory, in the end?',
            conditions: [{ type: 'quest', questId: 'mq_09_poacher_camp', state: 'completed' }, { type: 'flag', flag: 'jory', value: 'turned_in' }],
            next: 'jory_turned',
          },
          { text: 'Just checking in.' },
        ],
      },
      history: {
        text:
          "\"Since before the poachers started thinking this forest was theirs to strip. My grandmother warded these kelp beds, and hers before that. It's not a job so much as a debt you keep paying.\"",
      },
      jory_spared: {
        text:
          "\"Heard you let him run. Bold call — could've gone very wrong. Word is he's actually trying to make good on it, which is more than I expected from a poacher. Don't let it go to your head.\"",
      },
      jory_turned: {
        text:
          '"You handed him over, clean. He\'s sitting in an outpost cell now, last I heard, singing every name he knows to anyone who\'ll listen. Cold, maybe. Effective, certainly."',
      },
    },
  },

  {
    id: 'dlg_poacher_defector',
    start: 'start',
    nodes: {
      start: {
        text:
          "Jory flinches when he sees you, hands raised before you've said a word. \"Wait — wait, please. I'm not like the others, I swear it. I never wanted this, I just needed the coin.\"",
        options: [
          { text: 'Tell me about the operation first.', next: 'info' },
          {
            text: "I'll let you run. Disappear, and don't let me see you again.",
            conditions: [
              { type: 'flag', flag: 'jory', value: 'spared', not: true },
              { type: 'flag', flag: 'jory', value: 'turned_in', not: true },
            ],
            actions: [{ type: 'setFlag', flag: 'jory', value: 'spared' }],
            next: 'spared',
          },
          {
            text: "You're coming with me, to answer for this.",
            conditions: [
              { type: 'flag', flag: 'jory', value: 'spared', not: true },
              { type: 'flag', flag: 'jory', value: 'turned_in', not: true },
            ],
            actions: [{ type: 'setFlag', flag: 'jory', value: 'turned_in' }],
            next: 'turned',
          },
          { text: 'Still shaken up, huh.', conditions: [{ type: 'flag', flag: 'jory', value: 'spared' }], next: 'after_spared' },
          { text: 'Anything to say for yourself?', conditions: [{ type: 'flag', flag: 'jory', value: 'turned_in' }], next: 'after_turned' },
        ],
      },
      info: {
        text:
          "\"Someone up the chain's paying triple rate for whale parts, no questions asked. I don't know who — just that the coin's too good to ask twice. I've been sick about it since week one.\"",
        options: [
          {
            text: "I'll let you run. Disappear, and don't let me see you again.",
            conditions: [
              { type: 'flag', flag: 'jory', value: 'spared', not: true },
              { type: 'flag', flag: 'jory', value: 'turned_in', not: true },
            ],
            actions: [{ type: 'setFlag', flag: 'jory', value: 'spared' }],
            next: 'spared',
          },
          {
            text: "You're coming with me, to answer for this.",
            conditions: [
              { type: 'flag', flag: 'jory', value: 'spared', not: true },
              { type: 'flag', flag: 'jory', value: 'turned_in', not: true },
            ],
            actions: [{ type: 'setFlag', flag: 'jory', value: 'turned_in' }],
            next: 'turned',
          },
        ],
      },
      spared: {
        text:
          "Jory's shoulders sag with something between relief and disbelief. \"You mean it? I— I won't forget this. I'll make it right somehow, I swear it on whatever's left of Oma's good graces.\"",
      },
      turned: {
        text:
          "Jory doesn't fight you. He just nods, resigned, like he's been expecting this since the day he took the job. \"...Fair enough. I earned it.\"",
      },
      after_spared: {
        text:
          "\"Still jumping at shadows, yeah. Old crew doesn't forgive easy. But I'm trying to be someone worth the mercy you showed me. Slowly.\"",
      },
      after_turned: {
        text: 'Jory looks up at you from wherever he\'s being held, tired but not unkind. "No hard feelings. I did wrong. You did right. That\'s about the size of it."',
      },
    },
  },

  {
    id: 'dlg_borran',
    start: 'start',
    nodes: {
      start: {
        text:
          'Chief Borran\'s voice carries over half the outpost even at a normal volume. "Well met! Gale Outpost welcomes all comers — mind the windmills, they\'ve got opinions about where people stand."',
        options: [
          { text: 'Tell me about Gale Outpost.', next: 'outpost' },
          { text: 'How bad has the storm trouble gotten?', next: 'storm' },
          { text: 'You seem awfully cheerful for a man managing a crisis.', next: 'cheer' },
          { text: 'Just looking around.' },
        ],
      },
      outpost: {
        text:
          '"Built on the cliffs generations back, when someone realized skyships needed somewhere between the whale-towns to refuel and repair. Now it\'s half trading post, half fortress, and entirely mine to keep standing."',
      },
      storm: {
        text: '"Bad, and getting worse. Something\'s stirring the weather up here same as something\'s stirring Oma down there. I don\'t believe in coincidence, not at my age."',
      },
      cheer: {
        text:
          "Borran laughs, big and genuine. \"Cheerful keeps morale up. Outpost falls apart the day I start looking as worried as I actually am, so — cheerful it is.\"",
      },
    },
  },

  {
    id: 'dlg_hale',
    start: 'start',
    nodes: {
      start: {
        text: 'Commander Hale stands at parade rest, eyes assessing you before you\'ve even spoken. "Recruit. Or aspiring recruit. State your business."',
        options: [
          { text: 'What makes a good vanguard?', next: 'philosophy' },
          { text: 'Why train fighters here, of all places?', next: 'why_here' },
          { text: 'No business. Just looking.' },
        ],
      },
      philosophy: {
        text:
          "\"Discipline. Anyone can swing hard once. A vanguard swings hard for the fortieth time in a fight, when everyone else is exhausted and scared. That's the whole job, really — being the one who doesn't quit.\"",
      },
      why_here: {
        text:
          '"Storms don\'t wait for convenient timing, and neither do the things that come with them. Gale Outpost needed fighters who could hold a line against weather itself. I intend to keep providing them."',
      },
    },
  },

  {
    id: 'dlg_ysolde',
    start: 'start',
    nodes: {
      start: {
        text:
          'Archmage Ysolde\'s workshop smells faintly of ozone and something that might once have been tea. "Oh! A visitor. Do mind the floor, some of it\'s still technically an experiment."',
        options: [
          { text: 'What draws you to storm magic?', next: 'draw' },
          { text: 'Any spells gone wrong recently?', next: 'oops' },
          { text: "I'll let you get back to it." },
        ],
      },
      draw: {
        text:
          "\"It's alive, is the thing — storms have moods, currents, arguments with themselves. Learning to speak that language felt less like study and more like making a very large, very dangerous friend.\"",
      },
      oops: {
        text:
          "Ysolde gestures at a scorch mark shaped vaguely like a startled expression. \"That was Tuesday. I'd rather not elaborate. Science requires sacrifice, occasionally of the ceiling.\"",
      },
    },
  },

  {
    id: 'dlg_kestrel',
    start: 'start',
    nodes: {
      start: {
        text:
          "Ranger Kestrel doesn't stop checking her bowstring tension when you approach. \"If you're here to talk, talk quick. If you're here to learn, watch first.\"",
        options: [
          { text: "What's the secret to good aim?", next: 'aim' },
          { text: 'Bow or gun — which do you prefer?', next: 'preference' },
          { text: "I'll watch, then." },
        ],
      },
      aim: {
        text:
          '"Patience, mostly. Everyone wants the flashy shot. The good shot is the boring one you\'ve practiced ten thousand times until it isn\'t a choice anymore, just a fact."',
      },
      preference: {
        text:
          '"Bow. Quieter, cleaner, no reload rattling around giving your position away. Guns have their uses. I just don\'t happen to need them."',
      },
    },
  },

  {
    id: 'dlg_whisper',
    start: 'start',
    nodes: {
      start: {
        text: 'Whisper says nothing for a long moment, simply watching. Then, quietly: "You found me. Most don\'t, on the first try."',
        options: [
          { text: 'Why do you train fighters in secret?', next: 'secret' },
          { text: 'What made you choose the shadows?', next: 'choice' },
          { text: "I'll leave you to it." },
        ],
      },
      secret: {
        text:
          '"Loud lessons make loud students. I prefer mine capable of disappearing entirely, when disappearing is the smarter option. Most fights are won before the first blade moves."',
      },
      choice: {
        text: '"The shadows chose me, more truthfully. I simply stopped fighting the choice. There\'s a kind of peace in it, once you stop needing to be seen."',
      },
    },
  },

  {
    id: 'dlg_grell_camp',
    start: 'start',
    nodes: {
      start: {
        text: 'Grell\'s camp voice is rougher out here, wind-scoured. "Storm\'s worse up here than the harbor ever gets. Good. Keeps people sharp. What do you need?"',
        options: [
          { text: "How's the war effort up here?", next: 'war' },
          {
            text: 'For the Guild!',
            conditions: [{ type: 'flag', flag: 'faction', value: 'harpooners' }],
            actions: [{ type: 'reputation', faction: 'harpooners', amount: 10 }],
            next: 'cheer',
          },
          { text: 'Just checking in.' },
        ],
      },
      war: {
        text:
          "\"Losing skiffs faster than we build them. But we're not losing ground, and up here, that counts as winning. Guild doesn't quit just because the wind's rude about it.\"",
      },
      cheer: {
        text: 'Grell almost smiles. "That\'s the spirit. Guild remembers loyalty."',
      },
    },
  },

  {
    id: 'dlg_aolani_camp',
    start: 'start',
    nodes: {
      start: {
        text: 'Aolani\'s shrine on the ledges hums faintly, even in the wind. "You\'ve climbed far to find me. What troubles you, traveler?"',
        options: [
          { text: 'How does the Rite help, up here?', next: 'rite' },
          { text: 'Could you ease my aches?', actions: [{ type: 'heal' }], next: 'heal_flavor' },
          {
            text: 'For the Tidekeepers.',
            conditions: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }],
            actions: [{ type: 'reputation', faction: 'tidekeepers', amount: 10 }],
            next: 'cheer',
          },
          { text: 'Just passing through.' },
        ],
      },
      rite: {
        text:
          '"The storm up here is angry, not evil — angry things can still be soothed, given the right song and enough patience. The Rite reminds the wind that it, too, was gentle once."',
      },
      heal_flavor: {
        text: 'Aolani\'s hum carries even through the wind, and the ache drains right out of you. "The storm needn\'t take everything. Go gently."',
      },
      cheer: {
        text: 'Aolani inclines her head. "The currents remember kindness. Thank you."',
      },
    },
  },

  {
    id: 'dlg_nell',
    start: 'start',
    nodes: {
      start: {
        text:
          "Diver Nell grins at you, salt-crusted and entirely too enthusiastic for someone who works in genuinely dangerous water. \"Well hello! Come to see the glow, or looking for trouble?\"",
        options: [
          { text: 'Tell me about the reef.', next: 'reef' },
          { text: "Aren't you scared, diving here?", next: 'scared' },
          { text: 'Just passing through.' },
        ],
      },
      reef: {
        text:
          '"Prettiest water in Driftwake, hand to heart. Bioluminescent everything — fish, coral, even the mud glows a bit if you squint. Shame about the ghost ship and the encroaching dread, otherwise it\'d be paradise."',
      },
      scared: {
        text: '"Terrified, most days. Doesn\'t stop me diving. Fear\'s just information — tells you where to be careful, not where to stay home."',
      },
    },
  },

  {
    id: 'dlg_lamplighter',
    start: 'start',
    nodes: {
      start: {
        text: "The Lamplighter's light flares gently, warm despite the cold water. \"Ah. A living visitor. It has been quieter, lately, than I would like.\"",
        options: [
          { text: 'How long have you haunted this reef?', next: 'howlong' },
          {
            text: 'What happened to your ship?',
            conditions: [{ type: 'quest', questId: 'mq_15_logbook', state: ['ready', 'completed'] }],
            next: 'ship',
          },
          { text: 'Do you regret staying?', next: 'regret' },
          { text: "I'll leave you to your light." },
        ],
      },
      howlong: {
        text:
          "\"Longer than I have kept exact count of. Time moves strangely for the drowned. I remember Captain Rook clearly, though. Some things a ghost cannot forget, however much time passes.\"",
      },
      ship: {
        text:
          "\"We went down in a storm the Captain caused trying to save us all — speared something ancient to force a course correction. I did not understand, then, what she had truly done. I understand far too well, now.\"",
      },
      regret: {
        text: '"Sometimes. Mostly I stay because someone should remember properly, and remembering is easier when you have nowhere else to be."',
      },
    },
  },

  {
    id: 'dlg_first_singer',
    start: 'start',
    nodes: {
      start: {
        text:
          'A voice made of overlapping harmonies fills the cavern, though no single shape quite resolves into a speaker. "Small one. You have come far, into the oldest part of her. Ask what you will."',
        options: [
          { text: 'What are you, exactly?', next: 'what' },
          {
            text: "What really happened to Oma's heart?",
            conditions: [{ type: 'quest', questId: 'mq_18_echoes', state: ['ready', 'completed'] }],
            next: 'truth',
          },
          { text: 'Is Oma in pain?', next: 'pain' },
          { text: 'I should go.' },
        ],
      },
      what: {
        text:
          "\"An echo, mostly. The First Singer sang the song that first taught whales like Oma to fly rather than sink — and when that singer passed, something of the song remained, caught in her deepest chamber. I am memory more than being, but memory can still matter.\"",
      },
      truth: {
        text:
          "\"Long, long ago, a captain in a dying ship speared this very heart, meaning only to force a turn that would save her crew. It worked. It also wounded something that had never once been wounded before, in a place that never fully closes. The Blight is that wound, still open, still bleeding, after all these years.\"",
        options: [
          { text: 'Can it be closed, after all this time?', next: 'truth2' },
          { text: '...I see.' },
        ],
      },
      truth2: {
        text:
          "\"Perhaps. Wounds this old rarely close cleanly — but they can be answered. With force, with mercy, or, if you have walked gently enough, with both at once. That choice is not mine to make, small one. It is yours.\"",
      },
      pain: {
        text:
          "\"Yes. Quietly, mostly — she has borne it a very long time, and pain borne long enough starts to look like patience from the outside. It is not patience. It is endurance. There is a difference.\"",
      },
    },
  },
];
