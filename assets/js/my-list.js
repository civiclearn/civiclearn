(function () {
  // Safety
  if (!window.CivicEdgeEngine) {
    console.error("CivicEdgeEngine not found");
    return;
  }

  const listEl = document.getElementById("myList");
  if (!listEl) {
    console.error("#myList container not found");
    return;
  }

  // -------- helpers --------

  function clear() {
    listEl.innerHTML = "";
  }

function emptyState() {
  const div = document.createElement("div");
  div.className = "muted";
  div.style.padding = "1rem";
  div.textContent = CivicLearnI18n.t(
    "my_list_empty",
    "Your list is empty"
  );
  listEl.appendChild(div);
}


function renderItem(q) {
  const card = document.createElement("div");
  card.className = "mylist-card";

/* Header row: question + badge + remove */
const header = document.createElement("div");
header.className = "mylist-question-row";

/* Question */
const title = document.createElement("div");
title.className = "mylist-question";
title.textContent = q.text || "";

/* Microtopic badge */
const badge = document.createElement("div");
badge.className = "mylist-badge";
badge.textContent = q.topicDisplay || q.topicLabel || "";

/* Remove button */
const actions = document.createElement("div");
actions.className = "mylist-actions";

const removeBtn = document.createElement("button");
removeBtn.className = "mylist-remove";
removeBtn.textContent = CivicLearnI18n.t("my_list_remove", "Remove");
removeBtn.onclick = () => {
  CivicEdgeEngine.toggleSavedQuestion(q.id);
  card.remove();
    updateCount(listEl.children.length);

  if (!listEl.children.length) {
    emptyState();
  }
};



actions.appendChild(removeBtn);

header.appendChild(title);
header.appendChild(badge);
header.appendChild(actions);

card.appendChild(header);


  /* Answers */
  const optionsWrap = document.createElement("div");
  optionsWrap.className = "mylist-options";

  let locked = false;

  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "mylist-option";
    btn.textContent = opt.text;

    btn.addEventListener("click", () => {
      if (locked) return;
      locked = true;

      // mark clicked option
      if (opt.correct) {
        btn.classList.add("correct");
      } else {
        btn.classList.add("wrong");
        // also highlight correct one
        [...optionsWrap.children].forEach(b => {
          const o = q.options.find(x => x.text === b.textContent);
          if (o && o.correct) b.classList.add("correct");
        });
      }

      // lock all buttons
      [...optionsWrap.children].forEach(b => b.disabled = true);
    });

    optionsWrap.appendChild(btn);
  });

  card.appendChild(optionsWrap);


  return card;
}

function updateCount(n) {
  const el = document.getElementById("myListCount");
  if (!el) return;

  if (!n) {
    el.textContent = "";
    return;
  }

  const label = n === 1
    ? CivicLearnI18n.t("my_list_count_one", "1 question")
    : CivicLearnI18n.t("my_list_count_many", "{n} questions").replace("{n}", n);

  el.textContent = label;
}


  // -------- main render --------

function render() {
  clear();

  const ids = CivicEdgeEngine.getSavedQuestionIds();

  // bank is already loaded by dashboard pages
  const bank = CivicEdgeEngine.getBank?.() || [];
  const map = new Map(bank.map((q) => [q.id, q]));

  let rendered = 0;

  ids.forEach((id) => {
    const q = map.get(id);
    if (q) {
      listEl.appendChild(renderItem(q));
      rendered++;
    }
  });

  updateCount(rendered);

  if (!rendered) {
    emptyState();
  }
}


  // -------- init --------


(async () => {
  await CivicEdgeEngine.start("quick", { limit: 0 });
  render();
})();


})();

