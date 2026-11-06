/* ---- Boot ---- */
(async () => {
  const [, art] = await Promise.all([loadSheet(), prepareArt()]);
  Router.register('home', createHome($('.room-home'), art));
  Router.register('house', createHouse($('.room-house')));
  Router.register('line', createLine($('.room-line')));
  Router.register('kits', createKits($('.room-kits')));
  Router.register('faq', createFaq($('.room-faq')));
  Router.start();
})();
