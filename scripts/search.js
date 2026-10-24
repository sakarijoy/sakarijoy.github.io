const form = document.querySelector('[data-search-form]');
if (form) {
  const input = form.querySelector('[data-search-input]');
  const clear = form.querySelector('[data-search-clear]');
  const status = form.querySelector('[data-search-status]');
  const empty = document.querySelector('[data-search-empty]');
  const cards = [...document.querySelectorAll('[data-search-card]')];
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  function update() {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const text = normalize(card.dataset.searchText);
      card.hidden = !terms.every(term => text.includes(term));
      if (!card.hidden) visible++;
    }
    clear.hidden = !input.value;
    empty.hidden = !terms.length || visible > 0;
    status.textContent = terms.length ? '找到 ' + visible + ' 篇文章' : '共 ' + cards.length + ' 篇文章';
  }
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  input.addEventListener('input', update);
  clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  update();
}
