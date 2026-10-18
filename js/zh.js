/* 中文 for Magic 8: every answer, second opinion, toast, button and tooltip, and the ? panel (Kit.lang, kit/lang.js).
   What stays English on purpose: the kids' names, the toy's name and logo, the questions the kids type (any language),
   and the recorded voice clips (js/voices.js).
   Changed or added a line in js/answers.js? Add its 中文 here too, or it shows in English. */
(function () {
  const L = Kit.lang;
  L.keep(['Magic 8', 'Teddy & Tommy', 'Magic 8: Teddy & Tommy', 'TEDDY', 'TOMMY', 'Teddy', 'Tommy']);

  L.add({
    // the answers (js/answers.js): Teddy
    "SWISH! That's a YES!": '唰！进球！是的！',
    'It is certain, champ!': '肯定是，冠军！',
    'Without a doubt! 🥊': '毫无疑问！🥊',
    'Yes! Definitely!': '是的！绝对是！',
    'You can count on it!': '包在我身上！',
    'As I see it... YES!': '我看呀……是的！',
    'Most likely! Like 99%!': '很有可能！大概 99%！',
    'Knockout YES! 🥊': '一拳搞定：是的！🥊',
    'Slam dunk YES! 🏀': '扣篮！是的！🏀',
    'Signs point to YES! 👍': '种种迹象都说：是！👍',
    "Hmm... it's fuzzy. Try again!": '嗯……看不清，再试一次！',
    'Ask me again after practice!': '等我练完球再问我！',
    "Top secret! Can't tell you yet 🤐": '绝密！现在还不能说 🤐',
    "It's a jump ball... ask again!": '争球中……再问一次！',
    'Concentrate... and ask again!': '专心想一想……再问一次！',
    'No way, José!': '没门儿！',
    "Don't count on it, buddy!": '别指望啦，伙计！',
    "Airball! That's a no!": '三不沾！不行！',
    'Nope! Not this time.': '不行！这次不行。',
    'Very doubtful, champ.': '很难说哦，冠军。',
    // Tommy
    '✌️ Totally yes!': '✌️ 当然是！',
    'Yes yes YES!': '是是是！',
    'For sure! Dino promise! 🦖': '一定！恐龙保证！🦖',
    'Yes! Even the aliens say yes! 👽': '是的！连外星人都说是！👽',
    'Without a doubt!': '毫无疑问！',
    'Definitely! ✌️': '绝对是！✌️',
    'You can count on it! 1, 2, 3!': '包在我身上！1、2、3！',
    'Mmm-hmm! Yes!': '嗯嗯！是的！',
    'Looking good! ✌️✌️': '看起来不错！✌️✌️',
    'The UFO says YES! 🛸': '飞碟说：是！🛸',
    'Ask me after snack time 🍪': '吃完点心再问我 🍪',
    'Hmm... my brain is sleepy. Ask again!': '嗯……我的脑袋困了，再问一次！',
    "It's a secret! Shhh 🤫": '这是秘密！嘘 🤫',
    'The UFO is still thinking... 🛸': '飞碟还在想……🛸',
    'Close your eyes and ask again!': '闭上眼睛再问一次！',
    'Nope nope nope!': '不不不！',
    'No way! 🙅': '不行！🙅',
    'Hmm... no.': '嗯……不行。',
    'The dinosaurs say NO! 🦖': '恐龙说：不行！🦖',
    'Not today!': '今天不行！',

    // second opinions: Tommy about Teddy's answer
    'I agree with Teddy! ✌️': '我同意 Teddy！✌️',
    'Yep! What he said!': '对！他说得对！',
    'Same answer! Double power!': '一样的答案！双倍能量！',
    'Teddy is right! High five! 🙌': 'Teddy 说得对！击个掌！🙌',
    'Hmm... my tummy says something different!': '嗯……我的肚子说不一样！',
    'Nuh-uh! I think the other way!': '才不是！我觉得正好相反！',
    'Let me check... nope, I disagree!': '让我看看……不对，我不同意！',
    'Plot twist! I say the opposite!': '大反转！我说正好相反！',
    "Ask the ball something! I'll wait! ✌️": '快问魔法球！我等着！✌️',
    'Shake it, shake it! I wanna see!': '摇呀摇！我想看！',
    // Teddy about Tommy's answer
    "Tommy's right! Nothing but net!": 'Tommy 说得对！空心进球！',
    'Same here! Team Brothers! 💪': '我也一样！兄弟队！💪',
    'Yup! I double-checked it!': '对！我又确认了一遍！',
    "Agree! That's a slam dunk!": '同意！这是个扣篮！',
    'Foul! I call the other way!': '犯规！我说正好相反！',
    'Hmm, instant replay says the opposite!': '嗯，回放显示正好相反！',
    'Not so fast! I think the other way!': '等一下！我觉得正好相反！',
    'Good try, Tommy! I say different!': '不错哦 Tommy！不过我说不一样！',
    "Ask the ball something! I'm warmed up!": '快问魔法球！我热好身了！',
    "Shake it! Let's see what it says!": '摇一摇！看看它怎么说！',

    // the page: who answers, buttons and their tooltips
    BOTH: '轮流',
    'Who answers?': '谁来回答？',
    'Teddy answers (1)': 'Teddy 回答 (1)',
    'They take turns (2)': '轮流回答 (2)',
    'Tommy answers (3)': 'Tommy 回答 (3)',
    'Turn on shaking: shake your iPad or phone to ask': '打开摇一摇：摇晃 iPad 或手机来提问',
    'Turn on shake to ask': '打开摇一摇提问',
    'Last questions (H)': '最近的问题 (H)',
    'Last questions': '最近的问题',
    'Sound and voice on/off (M)': '声音和配音 开 / 关 (M)',
    'Sound on or off': '声音 开 / 关',
    'The magic 8-ball with Teddy and Tommy': 'Teddy 和 Tommy 的魔法 8 号球',
    '👆 TAP ME!': '👆 点我！',
    'Ask Teddy & Tommy anything…': '问 Teddy 和 Tommy 任何问题…',
    'Your question': '你的问题',
    '🎱 SHAKE!': '🎱 摇一摇！',
    '2nd opinion!': '也问问他！',
    'Tap or drag the ball': '点或拖动魔法球',
    'shakes ·': '摇球 ·',
    'calls': '叫',
    '· or shake the iPad / phone': '· 或摇晃 iPad / 手机',
    // the history panel
    '📜 Last questions': '📜 最近的问题',
    Close: '关闭',
    'Nothing yet. Ask the ball something!': '还没有问题哦，快问问魔法球！',
    '🤫 a secret question': '🤫 一个秘密问题',
    // toasts
    'SWISH!': '唰！进球！',
    '📳 SHAKE TO ASK!': '📳 摇一摇来提问！',
    'Tap the ball instead!': '那就点一下魔法球吧！',

    // the ? panel (js/keys.js)
    'shake the ball': '摇魔法球',
    'go to the question box': '去问题框',
    'who answers: Teddy · Both · Tommy': '谁回答：Teddy · 轮流 · Tommy',
    'call the other brother': '叫兄弟来帮忙',
    'the last 8 answers': '最近 8 个答案',
    'sound and voice on / off': '声音和配音 开 / 关',
    'Tap or drag the ball to shake it, or shake the iPad itself (tap 📳 once first). Tap a brother to see his signature move.':
      '点或拖动魔法球来摇它，也可以直接摇晃 iPad（先点一下 📳）。点一下兄弟，看他的招牌动作。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  L.rule(/^(.+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(.+) AGAIN!$/, '$1 又来啦！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 送来的${TREAT[item]}！`);
  L.rule(/^(Teddy|Tommy)'s turn$/, '轮到 $1');
  L.rule(/^Call (Teddy|Tommy) for a second opinion \(T\)$/, '叫 $1 来说说看 (T)');
  L.rule(/^Call (Teddy|Tommy)$/, '叫 $1');
  // a second opinion under an answer in the history panel
  L.rule(/^(Teddy|Tommy): (.+)$/, (m, who, line) => `${who}：${L.t(line)}`);
})();
