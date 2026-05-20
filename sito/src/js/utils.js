/* utils.js — utilità condivise: caricato prima di tutti gli altri script */
(function () {
  'use strict';

  /* formatFragmentLabel(id) → "Pozzo N" | "Soglia X.Y" | "Soglia X.Ya"
   *
   * Regole ID:
   *   p1       → Pozzo 1
   *   s1-1     → Soglia 1.1
   *   s1-1b    → Soglia 1.1b   (lettera attaccata al numero)
   *   s1-2-a   → Soglia 1.2a   (lettera dopo secondo trattino)
   *   s2-2a    → Soglia 2.2a
   */
  function formatFragmentLabel(id) {
    var pozzo = id.match(/^p(\d+)$/);
    if (pozzo) return 'Pozzo ' + pozzo[1];

    var soglia = id.match(/^s(\d+)-(\d+)(?:-([a-z])|([a-z]))?$/);
    if (soglia) {
      var letter = soglia[3] || soglia[4] || '';
      return 'Soglia ' + soglia[1] + '.' + soglia[2] + letter;
    }

    return id;
  }

  window.formatFragmentLabel = formatFragmentLabel;
}());
