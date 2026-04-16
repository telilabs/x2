exports.render = function (props) {
  return (
    <>
      <x2-app-header />
      <main>
        <x2-route x2-route="home">
          <x2-note-form />
          <x2-note-list />
        </x2-route>
        <x2-route x2-route="about">
          <x2-about-page />
        </x2-route>
      </main>
    </>
  );
};
