/* ---- Boot ---- */
(async () => {
  const [, art] = await Promise.all([loadSheet(), prepareArt()]);
  Router.register('home', createHome($('.room-home'), art));
  Router.register('line', createLine($('.room-line')));
  Router.register('kits', createKits($('.room-kits')));
  Router.start();
})();
