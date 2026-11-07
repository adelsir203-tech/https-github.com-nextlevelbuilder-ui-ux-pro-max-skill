/* ---- Boot ---- */
(async () => {
  await loadSheet();
  Router.register('home', createTower($('.room-home')));
  Router.register('house', createHouse($('.room-house')));
  Router.register('line', createLine($('.room-line')));
  Router.register('kits', createKits($('.room-kits')));
  Router.register('faq', createFaq($('.room-faq')));
  Router.start();
})();
