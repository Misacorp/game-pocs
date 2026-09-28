import type { DialogueDef } from '../../types';

/**
 * Act VI — The Drift Beyond. NPC dialogue trees for Vesper's Landing.
 * Quest offer/progress/complete text is shown automatically by the UI; these trees hold the
 * extra conversation, and vary by the `ending` flag (from mq_19_heart) and the `faction` flag
 * (from mq_08_two_currents), same convention as dlg_maren / dlg_grell / dlg_aolani.
 */
export const VESPER_DIALOGUES: DialogueDef[] = [
  {
    id: 'dlg_archivist_lume',
    start: 'start',
    nodes: {
      start: {
        text:
          'The Archivist looks up from a book that seems to be reading itself as much as being read. "You came all this way on a whale you\'ve barely met. That either means you\'re very brave, or you\'ve done this before."',
        options: [
          { text: 'What are you, exactly?', next: 'what' },
          { text: 'Tell me about the Vesper.', next: 'vesper' },
          {
            text: 'What happened to Oma, in the end?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'harvest' }],
            next: 'oma_harvest',
          },
          {
            text: 'What happened to Oma, in the end?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'purify' }],
            next: 'oma_purify',
          },
          {
            text: 'What happened to Oma, in the end?',
            conditions: [{ type: 'quest', questId: 'mq_19_heart', state: 'completed' }, { type: 'flag', flag: 'ending', value: 'song' }],
            next: 'oma_song',
          },
          { text: 'I should get to work.' },
        ],
      },
      what: {
        text:
          '"An echo, same as the one who guided you through the Hollow — though we were colleagues once, not the same singer twice. I kept the spire\'s archive. I have kept it a very long time, mostly alone."',
      },
      vesper: {
        text:
          '"Older than Oma. Older, I suspect, than the sky-sea itself. She never surfaced in our lifetimes — we simply built our city on the dream that she might, someday, need tending. I did not expect to still be here when she finally did."',
        options: [
          { text: 'Why is she calling now?', next: 'calling' },
          { text: 'Thank you.' },
        ],
      },
      calling: {
        text:
          '"Oma\'s waking sent a shockwave through the whole cloud sea — perhaps it woke something in the Vesper too, some old wound of her own. I do not think it is coincidence that she surfaced now, of all ages. I think she heard Oma sing, and answered."',
      },
      oma_harvest: {
        text:
          '"The Harpooners\' way. Efficient. Final. I do not judge it — every generation solves its whale the way it knows how. I only hope you\'ll listen a little longer to this one before you decide."',
      },
      oma_purify: {
        text:
          '"Patience rewarded, then. That is rarer than it should be. I would like to think the Vesper deserves the same patience, if it comes to that."',
      },
      oma_song: {
        text:
          '"A duet, not a decision. I have read of such endings in the old records and never once believed them. I am glad to be wrong, this once."',
      },
    },
  },

  {
    id: 'dlg_vane',
    start: 'start',
    nodes: {
      start: {
        text:
          'Harlan Vane doesn\'t look up from the spyglass trained on the horizon. "There she is. Bigger than Oma, if you can believe it. Bigger opportunity, too."',
        options: [
          { text: 'What exactly do you want from her?', next: 'want' },
          { text: 'Does Grell know you\'re out here?', next: 'grell' },
          {
            text: 'For the Guild!',
            conditions: [{ type: 'flag', flag: 'faction', value: 'harpooners' }],
            actions: [{ type: 'reputation', faction: 'harpooners', amount: 10 }],
            next: 'cheer',
          },
          { text: 'Just looking around.' },
        ],
      },
      want: {
        text:
          '"Whatever\'s worth taking, before someone slower or softer gets there first. Doesn\'t have to be cruel. Just has to happen before the moment passes — moments like this don\'t repeat."',
        options: [
          { text: "And if it turns out she's not a resource?", next: 'not_resource' },
          { text: 'Understood.' },
        ],
      },
      not_resource: {
        text: '"Then I\'ll have been wrong before. Wouldn\'t be the first time. Doesn\'t change what I do until I know that for certain."',
      },
      grell: {
        text: '"She sent me. Old habits — see a whale in trouble, send Grell\'s best. I like to think that\'s still me."',
      },
      cheer: {
        text: 'Vane allows himself something close to a grin. "Good instincts. Stick with me and there\'ll be plenty worth having."',
      },
    },
  },

  {
    id: 'dlg_cantor_rell',
    start: 'start',
    nodes: {
      start: {
        text:
          'Cantor Rell stands very still, eyes closed, like she\'s listening to something under the wind. "Can you hear it? Not yet? Give it time. It grows on you — the song, I mean, not the patience."',
        options: [
          { text: 'What do you hear?', next: 'hear' },
          { text: 'Do you think this whale can be healed too?', next: 'heal' },
          {
            text: 'For the Tidekeepers.',
            conditions: [{ type: 'flag', flag: 'faction', value: 'tidekeepers' }],
            actions: [{ type: 'reputation', faction: 'tidekeepers', amount: 10 }],
            next: 'cheer',
          },
          { text: 'Peace to you, Cantor.' },
        ],
      },
      hear: {
        text:
          '"Grief, mostly. And under the grief, something that sounds almost like relief — as if she\'s been waiting a very long time for someone to finally come close enough to hear her at all."',
      },
      heal: {
        text:
          "\"I have to believe it. Aolani taught me that belief is only ever practical, in the end — the alternative asks nothing of us, and Vane's alternative asks even less. I'd rather ask something of myself.\"",
        options: [
          { text: "And if Vane gets there first?", next: 'vane_first' },
          { text: 'I understand.' },
        ],
      },
      vane_first: {
        text: '"Then I will have sung too slowly, and I will have to live with that. I am still going to sing."',
      },
      cheer: {
        text: 'Cantor Rell smiles, eyes still closed. "The song remembers kindness longer than the sky remembers storms. Thank you."',
      },
    },
  },

  {
    id: 'dlg_bryn_wick',
    start: 'start',
    nodes: {
      start: {
        text:
          '"Welcome to the edge of the map — literally, as far as anyone\'s charted. What can I get you?"',
        options: [
          { text: 'Why set up shop all the way out here?', next: 'why' },
          { text: 'Business good?', next: 'business' },
          { text: 'Any local gossip?', next: 'gossip' },
        ],
      },
      why: {
        text:
          '"Every adventurer who\'s survived this far needs somewhere to spend their coin before the last stretch. Might as well be me. Beats waiting tables back in Driftmoor."',
      },
      business: {
        text: '"Booming, if terrifying counts as a business condition. Everyone\'s buying like there\'s no tomorrow, which — out here, who really knows."',
      },
      gossip: {
        text: '"Vane and the Cantor argue by my stall every single day, polite as anything, never once agreeing. I\'ve started keeping score. Cantor\'s winning, if you\'re curious. Barely."',
      },
    },
  },
];
