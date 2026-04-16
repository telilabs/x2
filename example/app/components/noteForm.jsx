exports.render = function (props) {
  return (
    <form class="note-form" onsubmit="submitNote(event)">
      <input id="x2-note-input" type="text" placeholder="What needs to be done?" autocomplete="off" />
      <button type="submit">Add</button>
    </form>
  );
};

exports.submitNote = function (event) {
  event.preventDefault();
  var input = document.getElementById("x2-note-input");
  var text  = input.value.trim();
  if (text) {
    input.value = "";
    repo.setters.add(text);
  }
};
