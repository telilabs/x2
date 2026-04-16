exports.render = function (props) {
  var notes = repo.getters.all();
  if (!notes.length) return <p class="empty">No notes yet — add one above.</p>;
  return (
    <>
      <p class="stats">{repo.getters.doneCount()} of {notes.length} completed</p>
      <ul>
        {notes.map(function (n) {
          return <x2-note-item x2-id={n.id} x2-text={n.text} x2-done={n.done} />;
        })}
      </ul>
    </>
  );
};
