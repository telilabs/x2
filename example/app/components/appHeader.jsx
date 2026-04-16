exports.render = function (props) {
  var count = repo.getters.count();
  var done  = repo.getters.doneCount();
  var badge = count === 0 ? null : <span class="badge">{done}/{count}</span>;
  return (
    <header>
      <h1>x2 Notes {badge}</h1>
      <nav>
        <a href="/" onclick="navTo(event,'/')">Notes</a>
        <a href="/about" onclick="navTo(event,'/about')">About</a>
      </nav>
    </header>
  );
};

exports.navTo = function (event, path) {
  event.preventDefault();
  setRoute(path);
};
