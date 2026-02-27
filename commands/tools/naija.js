// commands/tools/naija.js
// .naija — random Nigerian proverb with explanation

const PROVERBS = [
  { proverb: 'When the music changes, so does the dance.', meaning: 'You must adapt when circumstances change.' },
  { proverb: 'A child who is not embraced by the village will burn it down to feel its warmth.', meaning: 'A person ignored by their community will eventually cause trouble to get attention.' },
  { proverb: 'Until the lion learns to write, every story will glorify the hunter.', meaning: 'History is written by those in power — the weak must tell their own story.' },
  { proverb: 'He who does not know one thing knows another.', meaning: 'Everyone has their own unique knowledge and skills.' },
  { proverb: 'Rain does not fall on one roof alone.', meaning: 'Troubles and blessings are shared by everyone; no one is immune.' },
  { proverb: 'The forest would be very silent if no bird sang except the one that sang best.', meaning: 'Everyone has value, not just the most talented.' },
  { proverb: 'Knowledge is like a garden — if it is not cultivated, it cannot be harvested.', meaning: 'You must consistently learn and practice to grow.' },
  { proverb: 'No matter how long the night, the day is sure to come.', meaning: 'Difficult times always pass; hope endures.' },
  { proverb: 'If you want to go fast, go alone. If you want to go far, go together.', meaning: 'Teamwork leads to greater and more lasting success.' },
  { proverb: 'A tree is straightened while it is young.', meaning: 'It is easiest to correct habits and character in youth.' },
  { proverb: 'The axe forgets, but the tree remembers.', meaning: 'The one causing harm moves on, while the victim carries the wound.' },
  { proverb: 'Not all that flies is a bird.', meaning: 'Appearances can be deceptive; look beyond the surface.' },
  { proverb: 'The mouth is used to eat and to speak — guard what you put in it.', meaning: 'Be careful about what you say and what you consume.' },
  { proverb: 'A child that is not taught will sell the family heirlooms in the market square.', meaning: 'Poor upbringing leads to poor decisions that affect the whole family.' },
  { proverb: 'Ashes fly back in the face of the one who throws them.', meaning: 'Harm done to others eventually returns to the doer.' },
  { proverb: 'The elder who does not teach the young will die without an heir.', meaning: 'Wisdom must be passed down or it will be lost.' },
  { proverb: 'A man who pays respect to the great paves the way for his own greatness.', meaning: 'Humility and respect open doors to opportunity.' },
  { proverb: 'Even the mightiest eagle must land to eat.', meaning: 'No one is too powerful to need basic things; pride has limits.' },
  { proverb: 'He who is being carried does not realize how far the town is.', meaning: 'Those helped by others do not appreciate the full effort involved.' },
  { proverb: 'One who relates to a cripple will learn to limp.', meaning: 'You become like those you spend time with.' },
  { proverb: 'A child who asks questions does not become a fool.', meaning: 'Asking questions is a sign of intelligence, not weakness.' },
  { proverb: 'The hyena does not forget where it buried a bone.', meaning: 'People rarely forget favors or injuries done to them.' },
  { proverb: 'Character is like smoke — you cannot hide it for long.', meaning: 'A person\'s true nature will always reveal itself eventually.' },
  { proverb: 'Two ants do not fail to pull one grasshopper.', meaning: 'Teamwork makes even the hardest tasks possible.' },
  { proverb: 'Speak softly and carry a big stick; you will go far.', meaning: 'Be diplomatic but be prepared for anything.' },
  { proverb: 'The grasshopper always makes the mistake of fighting the cock.', meaning: 'Know your limits — do not pick battles you cannot win.' },
  { proverb: 'A bad trader blames the market.', meaning: 'People who fail often make excuses instead of taking responsibility.' },
  { proverb: 'However long the road is, it always has an end.', meaning: 'Every journey or problem has an end — persevere.' },
  { proverb: 'When the cat is away, the mice go shopping.', meaning: 'In the absence of authority, people take liberties.' },
  { proverb: 'A child who has no mother will not have scars to show.', meaning: 'Without proper guidance and nurturing, a person lacks character and resilience.' },
  { proverb: 'The elephant does not get tired of its own trunk.', meaning: 'We are never burdened by what truly belongs to us.' },
  { proverb: 'One who tells the stories rules the world.', meaning: 'Control of narrative is control of power.' },
  { proverb: 'Until you have crossed the river, do not insult the crocodile.', meaning: 'Do not provoke a danger you have not yet escaped.' },
  { proverb: 'A pot cannot cook itself.', meaning: 'You need outside help and proper conditions to grow.' },
  { proverb: 'Empty vessels make the most noise.', meaning: 'Those with little knowledge or substance are often the loudest.' },
  { proverb: 'The wise do not sit on their wisdom and wait for things to happen.', meaning: 'Knowledge without action is useless.' },
  { proverb: 'When spiders unite they can tie down a lion.', meaning: 'Unity gives power even to the weak.' },
  { proverb: 'A fool at forty is a fool forever.', meaning: 'If someone hasn\'t learned wisdom by middle age, they likely never will.' },
  { proverb: 'Wherever a man goes to dwell, his character goes with him.', meaning: 'You cannot escape your own nature by changing location.' },
  { proverb: 'Hunger is felt by a slave and hunger is felt by a king.', meaning: 'Basic human needs are equal across all social classes.' },
  { proverb: 'Patience is the key that solves all problems.', meaning: 'Most difficulties are resolved by waiting and enduring.' },
  { proverb: 'By trying often, the monkey learns to jump from the tree.', meaning: 'Practice and persistence lead to skill.' },
  { proverb: 'He who learns, teaches.', meaning: 'The duty of those who gain knowledge is to share it.' },
  { proverb: 'A cutting word is worse than a bowstring — a cut may heal, but the cut of the tongue does not.', meaning: 'Words can wound more deeply and permanently than physical injury.' },
  { proverb: 'Wood already touched by fire is not hard to set alight.', meaning: 'Someone who has experienced something once is easily stirred to it again.' },
  { proverb: 'However big the whale, it cannot swallow water indefinitely.', meaning: 'Even the most powerful person has limits.' },
  { proverb: 'A quarrel is like buttermilk — once it is out of the churn, the more you shake it, the sourer it grows.', meaning: 'The more you fuel a conflict, the worse it becomes.' },
  { proverb: 'Do not call the forest that shelters you a jungle.', meaning: 'Respect those who protect or support you.' },
  { proverb: 'The death of an old man is like a burning library.', meaning: 'When an elder dies, vast accumulated wisdom is lost.' },
  { proverb: 'He who runs from a white ant may stumble upon a snake.', meaning: 'Avoiding a small problem carelessly can lead to a bigger one.' },
]

export default [
  {
    command: 'naija',
    aliases: ['proverb', 'nigerian', 'afrowisdom'],
    category: 'tools',
    handler: async (sock, msg, ctx) => {
      const item = PROVERBS[Math.floor(Math.random() * PROVERBS.length)]

      await sock.sendMessage(ctx.from, {
        text: [
          `🇳🇬 *Nigerian Proverb*`,
          `${'─'.repeat(28)}`,
          ``,
          `📜 _"${item.proverb}"_`,
          ``,
          `💡 *Meaning:*`,
          `${item.meaning}`,
        ].join('\n')
      }, { quoted: msg })
    }
  }
]
