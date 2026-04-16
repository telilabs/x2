exports.render = function (props) {
  var done = props.done === "true";
  return (
    <li class={"note-item" + (done ? " done" : "")}>
      <input type="checkbox" checked={done} onchange={`checkNote('${props.id}')`} />
      <span>{props.text}</span>
      <button class="delete" onclick={`deleteNote('${props.id}')`}>&#x2715;</button>
    </li>
  );
};

exports.checkNote = function (id) {
  repo.setters.toggle(id);
};

exports.deleteNote = function (id) {
  repo.setters.remove(id);
};
