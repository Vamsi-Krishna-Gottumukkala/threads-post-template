import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { supabaseConfig } from "./config.js";

const defaultHabits = [
  ["⏰", "Wake up early"], ["🏃", "Exercise"], ["📰", "Newspaper"],
  ["📖", "Study"], ["🎬", "Content Creation"], ["🚫", "NoFap"],
  ["💧", "Water Intake (2L)"], ["🍎", "No Junk Food"], ["🇯🇵", "Japanese"],
  ["🎯", "Edge Rewards"], ["🤬", "No Cuss"], ["📚", "Reading (Never Split the Difference)"],
  ["🗓️", "Plan for Tomorrow"], ["✍️", "Journal"], ["💵", "Log Expenses"]
].map(([icon, name]) => ({ icon, name, done: false }));

const storageKey = "daily-thread-builder";
const fields = ["day-number", "total-days", "post-title", "screen-time", "done-emoji", "missed-emoji"];
const $ = (id) => document.getElementById(id);
const configured = !supabaseConfig.url.startsWith("YOUR_") && !supabaseConfig.anonKey.startsWith("YOUR_");
const supabase = configured ? createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
let data = loadLocalData();
let editingIndex = null;
let user = null;
let saveTimer;
let signingUp = false;

function cloneDefaults() { return defaultHabits.map((habit) => ({ ...habit })); }
function loadLocalData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved && Array.isArray(saved.habits) ? saved : { habits: cloneDefaults() };
  } catch { return { habits: cloneDefaults() }; }
}

function cacheData() { localStorage.setItem(storageKey, JSON.stringify(data)); }

async function loadCloudData() {
  const { data: profile, error } = await supabase.from("thread_profiles").select("data").eq("id", user.id).maybeSingle();
  if (error) return setSaveState("Could not load your saved data");
  if (profile?.data?.habits) data = profile.data;
  cacheData();
  restoreFields();
  renderHabits();
  updatePreview();
  if (!profile) saveCloudData();
}

function saveData() {
  data.fields = Object.fromEntries(fields.map((id) => [id, $(id).value]));
  cacheData();
  if (!user) return;
  clearTimeout(saveTimer);
  setSaveState("Saving...");
  saveTimer = setTimeout(saveCloudData, 500);
}

async function saveCloudData() {
  if (!user) return;
  const { error } = await supabase.from("thread_profiles").upsert({ id: user.id, data, updated_at: new Date().toISOString() });
  setSaveState(error ? "Could not save changes" : "Saved to your account");
}

function setSaveState(message) { $("save-state").textContent = message; }
function restoreFields() { Object.entries(data.fields || {}).forEach(([id, value]) => { if ($(id)) $(id).value = value; }); }

function renderHabits() {
  const list = $("habit-list");
  list.replaceChildren();
  data.habits.forEach((habit, index) => {
    const row = document.createElement("div");
    row.className = "habit-row";
    const icon = document.createElement("span");
    icon.className = "habit-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = habit.icon;
    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(taskButton("↑", "Move task up", "move-up", index === 0), taskButton("↓", "Move task down", "move-down", index === data.habits.length - 1), taskButton("✎", "Edit task", "edit-task"), taskButton("×", "Remove task", "delete delete-task"));
    const status = document.createElement("label");
    status.className = "status-control";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.dataset.index = index;
    check.checked = habit.done;
    check.setAttribute("aria-label", habit.name);
    status.append(check);
    row.append(icon, name, actions, status);
    if (editingIndex === index) row.append(taskEditor(habit));
    list.append(row);
  });
  $("habit-count").textContent = data.habits.length;
}

function taskButton(symbol, label, className, disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `row-button ${className}`;
  button.textContent = symbol;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  return button;
}

function taskEditor(habit) {
  const editor = document.createElement("div");
  editor.className = "task-editor";
  const emoji = document.createElement("input");
  emoji.className = "edit-icon";
  emoji.value = habit.icon;
  emoji.maxLength = 8;
  const taskName = document.createElement("input");
  taskName.className = "edit-name";
  taskName.value = habit.name;
  taskName.maxLength = 70;
  const emojiLabel = document.createElement("label");
  emojiLabel.className = "field";
  emojiLabel.append(Object.assign(document.createElement("span"), { textContent: "Emoji" }), emoji);
  const nameLabel = document.createElement("label");
  nameLabel.className = "field";
  nameLabel.append(Object.assign(document.createElement("span"), { textContent: "Task name" }), taskName);
  const save = document.createElement("button");
  save.className = "save-task";
  save.type = "button";
  save.textContent = "Save";
  editor.append(emojiLabel, nameLabel, save);
  return editor;
}

function postText() {
  const day = $("day-number").value || "1";
  const total = $("total-days").value || "365";
  const title = $("post-title").value.trim() || "Self Improvement";
  const doneEmoji = $("done-emoji").value.trim() || "✅";
  const missedEmoji = $("missed-emoji").value.trim() || "❌";
  const list = data.habits.map((habit) => `${habit.icon} ${habit.name} — ${habit.done ? doneEmoji : missedEmoji}`).join("\n");
  const score = data.habits.filter((habit) => habit.done).length;
  $("score-value").textContent = score;
  return `Day ${day} / ${total} — ${title}\n\n${list}\n\n📱 Screen Time: ${$("screen-time").value.trim() || "—"}\n\nScore: ${score} / ${data.habits.length}\n\n#365daychallenge #selfimprovement`;
}

function updatePreview() { $("post-output").textContent = postText(); saveData(); }

function showApp(account) {
  user = account;
  $("app-content").hidden = !account;
  $("open-auth").hidden = Boolean(account);
  $("sign-out").hidden = !account;
  if (account) setSaveState(account.email);
}

function setAuthMessage(message, success = false) {
  const element = $("auth-message");
  element.textContent = message;
  element.classList.toggle("success", success);
}

restoreFields();
renderHabits();
$("post-output").textContent = postText();

$("habit-list").addEventListener("change", (event) => {
  if (!event.target.matches("input[type=checkbox]")) return;
  data.habits[Number(event.target.dataset.index)].done = event.target.checked;
  updatePreview();
});

$("habit-list").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const row = button.closest(".habit-row");
  const index = [...$("habit-list").children].indexOf(row);
  if (index < 0) return;
  if (button.classList.contains("move-up")) [data.habits[index - 1], data.habits[index]] = [data.habits[index], data.habits[index - 1]];
  if (button.classList.contains("move-down")) [data.habits[index + 1], data.habits[index]] = [data.habits[index], data.habits[index + 1]];
  if (button.classList.contains("edit-task")) editingIndex = editingIndex === index ? null : index;
  if (button.classList.contains("delete-task")) { data.habits.splice(index, 1); editingIndex = null; }
  if (button.classList.contains("save-task")) {
    const editor = button.closest(".task-editor");
    data.habits[index].icon = editor.querySelector(".edit-icon").value.trim() || "•";
    data.habits[index].name = editor.querySelector(".edit-name").value.trim() || "Untitled task";
    editingIndex = null;
  }
  renderHabits();
  updatePreview();
});

$("add-task").addEventListener("click", () => {
  data.habits.push({ icon: "✨", name: "New task", done: false });
  editingIndex = data.habits.length - 1;
  renderHabits();
  updatePreview();
  requestAnimationFrame(() => $("habit-list").querySelector(".edit-name")?.focus());
});

fields.forEach((id) => $(id).addEventListener("input", updatePreview));
$("clear-day").addEventListener("click", () => { data.habits.forEach((habit) => { habit.done = false; }); renderHabits(); updatePreview(); });
$("reset-template").addEventListener("click", () => {
  data = { habits: cloneDefaults() };
  fields.forEach((id) => {
    $(id).value = id === "day-number" ? "191" : id === "total-days" ? "365" : id === "post-title" ? "Self Improvement" : id === "done-emoji" ? "✅" : id === "missed-emoji" ? "❌" : "10hr 3m";
  });
  renderHabits();
  updatePreview();
});

$("copy-post").addEventListener("click", async () => {
  const label = $("copy-label");
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(postText());
    else {
      const helper = document.createElement("textarea");
      helper.value = postText(); helper.style.position = "fixed"; helper.style.opacity = "0";
      document.body.append(helper); helper.select();
      if (!document.execCommand("copy")) throw new Error("Copy unavailable");
      helper.remove();
    }
    label.textContent = "Copied";
    setTimeout(() => { label.textContent = "Copy post"; }, 1800);
  } catch { label.textContent = "Select preview to copy"; setTimeout(() => { label.textContent = "Copy post"; }, 2200); }
});

$("open-auth").addEventListener("click", () => { setAuthMessage(""); $("auth-dialog").showModal(); });
$("close-auth").addEventListener("click", () => $("auth-dialog").close());
$("auth-switch").addEventListener("click", () => {
  signingUp = !signingUp;
  $("auth-title").textContent = signingUp ? "Create account" : "Sign in";
  $("auth-eyebrow").textContent = signingUp ? "Start tracking" : "Member access";
  $("auth-submit").textContent = signingUp ? "Create account" : "Sign in";
  $("auth-switch").textContent = signingUp ? "Already a member? Sign in" : "New here? Create an account";
  $("auth-password").autocomplete = signingUp ? "new-password" : "current-password";
  setAuthMessage("");
});

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configured) return setAuthMessage("Add your Supabase credentials in config.js before deploying.");
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  $("auth-submit").disabled = true;
  const result = signingUp ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
  $("auth-submit").disabled = false;
  if (result.error) return setAuthMessage(result.error.message);
  if (signingUp && !result.data.session) return setAuthMessage("Check your email to confirm your account.", true);
  $("auth-dialog").close();
});

$("sign-out").addEventListener("click", () => supabase.auth.signOut());

if (configured) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) { showApp(sessionData.session.user); await loadCloudData(); }
  else { setSaveState("Sign in to save your own list"); }
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user && session.user.id !== user?.id) {
      showApp(session.user);
      setTimeout(() => { loadCloudData(); }, 0);
    }
    if (!session) { user = null; showApp(null); setSaveState("Sign in to save your own list"); }
  });
} else {
  setSaveState("Setup needed for member accounts");
}
