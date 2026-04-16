// Each export is a route guard: return true when the route should be visible.
// getRoute() is a global provided by the x2 runtime.
module.exports = {
  home: function () {
    return getRoute() === "/";
  },
  about: function () {
    return getRoute() === "/about";
  },
};
