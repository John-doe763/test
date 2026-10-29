const STORAGE_KEY = 'daylight.tasks.v1';
const day = new Date();
const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const plusDays = (n) => { const d = new Date(day); d.setDate(d.getDate()+n); return isoDate(d); };
const defaultTasks = [
  {id:'seed-1',title:'Plan the week ahead',detail:'Pick three things that would make this week feel good.',priority:'high',due:isoDate(day),done:false},
  {id:'seed-2',title:'Send the project update',detail:'Share a quick progress note with the team.',priority:'normal',due:isoDate(day),done:false},
  {id:'seed-3',title:'Take a proper lunch break',detail:'Step away from the desk and get some fresh air.',priority:'low',due:'',done:true},
  {id:'seed-4',title:'Book a table for Friday',detail:'Somewhere cosy, preferably with good pasta.',priority:'normal',due:plusDays(2),done:false},
  {id:'seed-5',title:'Pick up a few groceries',detail:'Oat milk, lemons, and something for dinner.',priority:'low',due:plusDays(1),done:false}
];
let tasks;
try { tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultTasks; } catch { tasks = defaultTasks; }
let view = 'today';
let filter = 'all';
let editingId = null;
const $ = (id) => document.getElementById(id);
const titleCase = (value) => value.charAt(0).toUpperCase()+value.slice(1);
const formatDate = (value, opts={weekday:'short',month:'short',day:'numeric'}) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined,opts);
const today = isoDate(day);

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); render(); }
function setDates() {
  const full = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(day);
  const short = new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(day);
  $('header-date').textContent = short;
  $('greeting-eyebrow').textContent = full.toUpperCase();
  const hour = day.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  $('page-title').innerHTML = `${greeting}, Sam<span class="sun">✳</span>`;
}
function getVisibleTasks() {
  let list = tasks.filter(task => {
    if (view === 'completed' || filter === 'done') return task.done;
    if (view === 'upcoming') return !task.done && task.due && task.due > today;
    return !task.done && (!task.due || task.due <= today);
  });
  if (filter === 'active') list = list.filter(task=>!task.done);
  const query = $('search-input').value.trim().toLowerCase();
  if (query) list = list.filter(task=>`${task.title} ${task.detail}`.toLowerCase().includes(query));
  return list.sort((a,b)=> (a.done-b.done) || ((a.due||'9999').localeCompare(b.due||'9999')) || (a.priority==='high'?-1:b.priority==='high'?1:0));
}
function taskDateLabel(value) {
  if (!value) return '';
  if (value < today) return 'Overdue';
  if (value === today) return 'Today';
  if (value === plusDays(1)) return 'Tomorrow';
  return formatDate(value);
}
function render() {
  const active = tasks.filter(t=>!t.done);
  const done = tasks.filter(t=>t.done).length;
  const pct = tasks.length ? Math.round(done/tasks.length*100) : 0;
  $('today-count').textContent = active.filter(t=>!t.due||t.due<=today).length;
  $('progress-fraction').textContent = `${done} of ${tasks.length}`;
  $('progress-percent').textContent = `${pct}%`;
  $('progress-fill').style.width = `${pct}%`;
  $('progress-message').textContent = tasks.length===0 ? 'A fresh page. Make it yours.' : done===tasks.length ? 'Look at you go. Everything is done!' : done ? 'Nice work. Keep that good feeling going.' : 'One step at a time. You’ve got this.';
  const labels = {today:'Today',upcoming:'Upcoming',completed:'Completed'};
  $('breadcrumb-view').textContent = labels[view];
  $('task-section-title').textContent = view==='today'?'Your tasks':view==='upcoming'?'Coming up':'You did it';
  $('page-subtitle').textContent = view==='today'?'A little progress each day adds up to big results.':view==='upcoming'?'A gentle look at what’s on the horizon.':'Every little thing you finished counts.';
  const list = getVisibleTasks();
  $('task-total').textContent = list.length;
  $('task-list').innerHTML = list.map(task => {
    const due = taskDateLabel(task.due);
    const overdue = task.due && task.due<today;
    return `<article class="task-row ${task.done?'is-done':''}" data-id="${task.id}">
      <button class="check-button" data-action="toggle" aria-label="${task.done?'Mark as not done':'Complete task'}" title="${task.done?'Mark as not done':'Complete task'}">${task.done?'<svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7"/></svg>':''}</button>
      <div class="task-info"><p class="task-title">${escapeHtml(task.title)}</p>${task.detail?`<div class="task-detail">${escapeHtml(task.detail)}</div>`:''}</div>
      <div class="task-meta"><span class="priority ${task.priority}">${titleCase(task.priority)}</span>${due?`<span class="due-date ${overdue?'overdue':''}">${due}</span>`:''}</div>
      <div class="row-actions"><button class="more-button" data-action="menu" aria-label="Task actions">···</button><div class="row-menu" hidden><button data-action="edit">Edit task</button><button data-action="delete">Delete task</button></div></div>
    </article>`;
  }).join('');
  const empty = list.length===0;
  $('empty-state').hidden = !empty;
  $('quick-add').hidden = view==='completed';
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function openDialog(task=null) {
  editingId = task?.id || null;
  $('dialog-title').textContent = task ? 'Edit task' : 'Add a task';
  $('task-title-input').value = task?.title || '';
  $('task-detail-input').value = task?.detail || '';
  $('task-priority-input').value = task?.priority || 'normal';
  $('task-date-input').value = task?.due || '';
  $('task-dialog').showModal();
  setTimeout(()=>$('task-title-input').focus(),50);
}
function closeDialog() { $('task-dialog').close(); }
$('task-form').addEventListener('submit', event=>{
  event.preventDefault();
  const title = $('task-title-input').value.trim();
  if (!title) return;
  const values = {title,detail:$('task-detail-input').value.trim(),priority:$('task-priority-input').value,due:$('task-date-input').value};
  if (editingId) tasks = tasks.map(task=>task.id===editingId?{...task,...values}:task);
  else tasks.unshift({id:crypto.randomUUID(),...values,done:false});
  closeDialog(); save();
});
$('task-list').addEventListener('click', event=>{
  const button = event.target.closest('[data-action]');
  if (!button) { document.querySelectorAll('.row-menu').forEach(menu=>menu.hidden=true); return; }
  const row = button.closest('.task-row');
  const task = tasks.find(item=>item.id===row.dataset.id);
  const action = button.dataset.action;
  if (action==='toggle') { task.done=!task.done; save(); }
  if (action==='menu') { const menu=row.querySelector('.row-menu'); const wasHidden=menu.hidden; document.querySelectorAll('.row-menu').forEach(el=>el.hidden=true); menu.hidden=!wasHidden; }
  if (action==='edit') { document.querySelectorAll('.row-menu').forEach(el=>el.hidden=true); openDialog(task); }
  if (action==='delete') { tasks=tasks.filter(item=>item.id!==task.id); save(); }
});
document.addEventListener('click',event=>{if(!event.target.closest('.row-actions'))document.querySelectorAll('.row-menu').forEach(menu=>menu.hidden=true);if(!event.target.closest('.filter-wrap'))$('filter-menu').hidden=true;});
document.querySelectorAll('.nav-item').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;filter='all';$('filter-label').textContent='All tasks';$('search-input').value='';document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item===button));render();}));
$('filter-button').addEventListener('click',()=>{$('filter-menu').hidden=!$('filter-menu').hidden;});
document.querySelectorAll('.filter-menu button').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;$('filter-label').textContent={all:'All tasks',active:'To do',done:'Completed'}[filter];$('filter-menu').hidden=true;render();}));
$('search-input').addEventListener('input',render);
['add-task-top','quick-add','empty-add'].forEach(id=>$(id).addEventListener('click',()=>openDialog()));
$('dialog-close').addEventListener('click',closeDialog);$('cancel-task').addEventListener('click',closeDialog);
$('task-dialog').addEventListener('click',event=>{if(event.target===$('task-dialog'))closeDialog();});
setDates(); render();
