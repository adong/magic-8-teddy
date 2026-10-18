/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: "Magic 8: Teddy & Tommy",
  keys: [
    ["shake the ball", "Space or Enter"],
    ["go to the question box", "/"],
    ["who answers: Teddy · Both · Tommy", "1 2 3"],
    ["call the other brother", "T"],
    ["the last 8 answers", "H"],
    ["sound and voice on / off", "M"],
  ],
  touch: "Tap or drag the ball to shake it, or shake the iPad itself (tap 📳 once first). Tap a brother to see his signature move.",
});
