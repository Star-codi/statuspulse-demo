const API_BASE = "/api";

const statusDot = document.getElementById("statusDot");
const apiStatusLine = document.getElementById("apiStatusLine");
const dbPill = document.getElementById("dbPill");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("bad status");
    statusDot.classList.add("live");
    statusDot.classList.remove("down");
    dbPill.classList.add("live");
    apiStatusLine.textContent = "frontend → api → db — all tiers reachable";
  } catch (err) {
    statusDot.classList.add("down");
    statusDot.classList.remove("live");
    apiStatusLine.textContent = "backend unreachable — check the api/db tiers";
  }
}

function renderTask(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.done ? " done" : "");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.addEventListener("change", () => toggleTask(task.id, checkbox.checked));

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = task.title;

  const remove = document.createElement("button");
  remove.className = "remove";
  remove.textContent = "remove";
  remove.addEventListener("click", () => deleteTask(task.id));

  li.append(checkbox, title, remove);
  return li;
}

async function loadTasks() {
  const res = await fetch(`${API_BASE}/tasks`);
  const tasks = await res.json();
  taskList.innerHTML = "";
  emptyState.hidden = tasks.length !== 0;
  tasks.forEach((t) => taskList.appendChild(renderTask(t)));
}

async function addTask(title) {
  await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  await loadTasks();
}

async function toggleTask(id, done) {
  await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  await loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  taskInput.value = "";
  addTask(title);
});

checkHealth();
loadTasks();
setInterval(checkHealth, 10000);
