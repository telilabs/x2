module.exports = {
  data: {
    notes: [],
    nextId: 1,
  },

  getters: {
    all: function () {
      return this.notes;
    },
    count: function () {
      return this.notes.length;
    },
    doneCount: function () {
      return this.notes.filter(function (n) { return n.done; }).length;
    },
  },

  setters: {
    add: function (text) {
      this.notes = this.notes.concat([{ id: this.nextId, text: text, done: false }]);
      this.nextId = this.nextId + 1;
    },
    toggle: function (id) {
      this.notes = this.notes.map(function (n) {
        return n.id === parseInt(id) ? { id: n.id, text: n.text, done: !n.done } : n;
      });
    },
    remove: function (id) {
      this.notes = this.notes.filter(function (n) { return n.id !== parseInt(id); });
    },
  },
};
