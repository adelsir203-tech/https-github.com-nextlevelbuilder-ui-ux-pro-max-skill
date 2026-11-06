/* ---- Room: how we build, prices, guarantees and questions ---- */
function createFaq(root) {
  let ac = null;
  return {
    el: root,
    start() {
      ac = new AbortController();
      $$('[data-open-bag]', root).forEach((b) => b.addEventListener('click', Bag.open, { signal: ac.signal }));
    },
    stop() { if (ac) ac.abort(); ac = null; },
    resize() {},
  };
}
