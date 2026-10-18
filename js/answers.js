/* Magic 8: everything the brothers say. Edit freely: add, remove or change lines, save, reload.

   Each brother has three lists, like the classic 8-ball (10 yes, 5 maybe, 5 no):
     yes    - he celebrates with his signature move (Teddy: boxing or a jump shot, Tommy: the Y peace sign) + confetti
     maybe  - he shrugs or scratches his head
     no     - a playful head shake
   The ball picks a list with the same odds as the lists' sizes, so 10/5/5 means half the answers are yes.
   Keep them short (the triangle in the ball is small) and kind. Emoji are fine: they show in the ball and the
   speech bubble, and are skipped when the answer is read aloud.

   `opinions` are the companion's "second opinion" lines, by who says them. `agree` / `disagree` follow an answer;
   `first` is for when nobody has asked the ball anything yet. {name} becomes the other brother's name. */
window.M8Answers = {
  teddy: {
    yes: [
      'SWISH! That\'s a YES!',
      'It is certain, champ!',
      'Without a doubt! 🥊',
      'Yes! Definitely!',
      'You can count on it!',
      'As I see it... YES!',
      'Most likely! Like 99%!',
      'Knockout YES! 🥊',
      'Slam dunk YES! 🏀',
      'Signs point to YES! 👍',
    ],
    maybe: [
      'Hmm... it\'s fuzzy. Try again!',
      'Ask me again after practice!',
      'Top secret! Can\'t tell you yet 🤐',
      'It\'s a jump ball... ask again!',
      'Concentrate... and ask again!',
    ],
    no: [
      'No way, José!',
      'Don\'t count on it, buddy!',
      'Airball! That\'s a no!',
      'Nope! Not this time.',
      'Very doubtful, champ.',
    ],
  },

  tommy: {
    yes: [
      '✌️ Totally yes!',
      'Yes yes YES!',
      'For sure! Dino promise! 🦖',
      'Yes! Even the aliens say yes! 👽',
      'Without a doubt!',
      'Definitely! ✌️',
      'You can count on it! 1, 2, 3!',
      'Mmm-hmm! Yes!',
      'Looking good! ✌️✌️',
      'The UFO says YES! 🛸',
    ],
    maybe: [
      'Ask me after snack time 🍪',
      'Hmm... my brain is sleepy. Ask again!',
      'It\'s a secret! Shhh 🤫',
      'The UFO is still thinking... 🛸',
      'Close your eyes and ask again!',
    ],
    no: [
      'Nope nope nope!',
      'No way! 🙅',
      'Hmm... no.',
      'The dinosaurs say NO! 🦖',
      'Not today!',
    ],
  },

  opinions: {
    // Tommy, about Teddy's answer
    tommy: {
      agree: [
        'I agree with {name}! ✌️',
        'Yep! What he said!',
        'Same answer! Double power!',
        '{name} is right! High five! 🙌',
      ],
      disagree: [
        'Hmm... my tummy says something different!',
        'Nuh-uh! I think the other way!',
        'Let me check... nope, I disagree!',
        'Plot twist! I say the opposite!',
      ],
      first: [
        'Ask the ball something! I\'ll wait! ✌️',
        'Shake it, shake it! I wanna see!',
      ],
    },
    // Teddy, about Tommy's answer
    teddy: {
      agree: [
        '{name}\'s right! Nothing but net!',
        'Same here! Team Brothers! 💪',
        'Yup! I double-checked it!',
        'Agree! That\'s a slam dunk!',
      ],
      disagree: [
        'Foul! I call the other way!',
        'Hmm, instant replay says the opposite!',
        'Not so fast! I think the other way!',
        'Good try, {name}! I say different!',
      ],
      first: [
        'Ask the ball something! I\'m warmed up!',
        'Shake it! Let\'s see what it says!',
      ],
    },
  },
};
