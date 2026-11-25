/* Everything is a local-first static web app. It sends no personal data to a server. */
(() => {
'use strict';
const STORE_KEY='everything-private-browser-v1';
const APP=document.getElementById('app');
const DIALOG=document.getElementById('edit-dialog');
const DIALOG_CONTENT=document.getElementById('dialog-content');
const EDIT_FORM=document.getElementById('edit-form');
const IMPORT_INPUT=document.getElementById('json-import');
const NAV=['home','todo','budget','events','meals','shopping','nutrition','logs','notes','archive','settings','more'];
const BLANK=()=>({todo:[],budget:{currency:'CHF',balance:0,balanceDate:'',spendingReferenceDate:'',monthly:[],bills:[]},events:[],recipes:[],extras:[],shoppingFoods:[],selectedMeals:[],nutrients:[],foodLogs:[],notes:[],water:{},targets:{calories:0,protein:0,carbs:0,fat:0,fiber:0,water:2000},foodFavorites:[],shoppingChecked:[],archive:{}});
let importFeedback='';
let data=load(); let route='home'; let pendingImport=''; let checkedShop=new Set(); let randomizedRecipes=[]; let filter={tasks:'due',taskSearch:'',events:'all',eventSearch:'',recipes:'',recipeCat:'all',recipeMin:'',recipeMax:'',nutrients:'',logMonth:'all',archiveSheet:'',archiveSearch:'',archivePage:0,notes:'',noteSort:'colour',taskSort:'due'};
checkedShop=new Set(data.shoppingChecked||[]);
let toastTimer;
// Decrypted protected notes exist only in temporary memory while opened.
let activeNoteId='';
let unlockedNote=null;
function lockOpenNote(){activeNoteId='';unlockedNote=null;}
function load(){try{const x=JSON.parse(localStorage.getItem(STORE_KEY)||'null');return normalize(x);}catch{return BLANK();}}
function normalize(obj){const base=BLANK();if(!obj||typeof obj!=='object')return base;for(const k of ['todo','events','recipes','extras','shoppingFoods','selectedMeals','nutrients','foodLogs','notes','foodFavorites'])if(Array.isArray(obj[k]))base[k]=obj[k];if(obj.budget&&typeof obj.budget==='object')base.budget={...base.budget,...obj.budget,monthly:Array.isArray(obj.budget.monthly)?obj.budget.monthly:[],bills:Array.isArray(obj.budget.bills)?obj.budget.bills:[]};if(obj.archive&&typeof obj.archive==='object'&&!Array.isArray(obj.archive))base.archive=obj.archive;if(obj.water&&typeof obj.water==='object'&&!Array.isArray(obj.water))base.water=obj.water;if(Array.isArray(obj.shoppingChecked))base.shoppingChecked=obj.shoppingChecked;if(obj.targets&&typeof obj.targets==='object')for(const k of ['calories','protein','carbs','fat','fiber','water'])base.targets[k]=Math.max(0,Number(obj.targets[k])||0);return base;}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(data));return true;}catch(e){toast('Storage is full or unavailable. Export a backup now.');return false;}}
function id(){return 'id-'+Math.random().toString(36).slice(2,10)+'-'+Date.now().toString(36);}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const esc=escapeHtml;
const fmtNumber=(x,d=0)=>new Intl.NumberFormat('en-CH',{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(x)||0);
const fmtMoney=(x)=>`${fmtNumber(x,2)} ${esc(data.budget.currency||'CHF')}`;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const safeDate=(s)=>/^\d{4}-\d\d-\d\d$/.test(s||'')?s:'';
function diffDays(s){const date=safeDate(s);if(!date)return null;const d=new Date(date+'T12:00:00');const now=new Date(today()+'T12:00:00');return Math.round((d-now)/86400000);}
function prettyDate(s){if(!safeDate(s))return esc(s||'No date');return new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3400);}
const n=(v)=>Number(v)||0;
function navigate(name){if(name!=='notes')lockOpenNote();const menu=document.getElementById('quick-add-menu');if(menu)menu.hidden=true;if(!NAV.includes(name))name='home';route=name;for(const a of document.querySelectorAll('[data-route]'))a.classList.toggle('active',a.dataset.route===route);render();window.scrollTo({top:0,behavior:'instant'});}
function headline(label,title,subtitle,actions=''){return `<div class="page-heading"><div><p class="eyebrow">${esc(label)}</p><h1 class="hero-title">${esc(title)}</h1><p>${esc(subtitle)}</p></div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;}
function btn(label,act,extra='',idValue=''){return `<button class="btn ${extra}" type="button" data-action="${esc(act)}"${idValue?` data-id="${esc(idValue)}"`:''}>${label}</button>`;}
function empty(icon,title,subtitle,action=''){return `<div class="empty"><div class="empty-icon">${icon}</div><strong>${esc(title)}</strong><p>${esc(subtitle)}</p>${action}</div>`;}
function inputField(name,label,value='',type='text',options={}){let inp;if(type==='textarea')inp=`<textarea class="field" data-field="${esc(name)}" rows="3">${esc(value)}</textarea>`;else if(type==='select')inp=`<select class="field" data-field="${esc(name)}">${(options.choices||[]).map(o=>`<option value="${esc(o)}" ${String(o)===String(value)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;else inp=`<input class="field" data-field="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${options.required?'required':''} ${options.step?`step="${esc(options.step)}"`:''}>`;return `<label class="input-label ${options.wide?'wide':''}">${esc(label)}${inp}${options.help?`<span class="form-help">${esc(options.help)}</span>`:''}</label>`;}
function modal(title,fields,onSave){DIALOG_CONTENT.innerHTML=`<h2>${esc(title)}</h2><div class="form-grid">${fields.join('')}</div><div class="dialog-actions"><button class="btn light" type="button" id="modal-cancel">Cancel</button><button class="btn" type="submit">Save changes</button></div>`;EDIT_FORM.onsubmit=(e)=>{e.preventDefault();const obj={};for(const el of DIALOG_CONTENT.querySelectorAll('[data-field]'))obj[el.dataset.field]=el.type==='number'?n(el.value):el.value;try{if(onSave(obj)!==false){save();DIALOG.close();render();}}catch(err){toast('Could not save: '+err.message);}};document.getElementById('modal-cancel').onclick=()=>DIALOG.close();DIALOG.showModal();const first=DIALOG_CONTENT.querySelector('[data-field]');first?.focus();}
function confirmDelete(message,fn){if(window.confirm(message)){fn();save();render();toast('Deleted.');}}
function addDays(date,frequency){const source=new Date((safeDate(date)||today())+'T12:00:00');const f=String(frequency||'one-time');if(f==='monthly'||f==='every 2 months'||f==='every 3 months'||f==='every 4 months'||f==='2x per year'||f==='yearly'){const months={'monthly':1,'every 2 months':2,'every 3 months':3,'every 4 months':4,'2x per year':6,'yearly':12}[f];const day=source.getDate();const target=new Date(source.getFullYear(),source.getMonth()+months,1,12);const last=new Date(target.getFullYear(),target.getMonth()+1,0,12).getDate();target.setDate(Math.min(day,last));return todayISO(target);}const steps={'daily':1,'every 2 days':2,'every 3 days':3,'weekly':7,'every 2 weeks':14};const matched=f.match(/^every (\d+) days?$/);const count=steps[f]||(matched?Number(matched[1]):Number(f));if(!Number.isFinite(count)||count<=0)return date;source.setDate(source.getDate()+count);return todayISO(source);}
function dueChip(t){if(t.completed)return '<span class="tag">Finished</span>';const delta=diffDays(t.due);const klass=delta===null?'':delta<0?'overdue':delta<=7?'soon':'ok';const label=delta===null?'No due date':delta<0?`${Math.abs(delta)}d overdue`:delta===0?'Due today':delta===1?'Tomorrow':`In ${delta}d`;return `<span class="due ${klass}">${esc(label)}</span>`;}
const MACRO_KEYS=['calories','protein','carbs','fat','fiber'];
const NOTE_COLORS={'none':'#8ba8a3','red':'#de655d','orange':'#e5a343','yellow':'#ddbb4f','green':'#3ca27a','blue':'#4a8fd1','purple':'#a77ad8'};
const TASK_COLORS={'none':'#cbd5d7','red':'#de655d','orange':'#e5a343','yellow':'#ddbb4f','green':'#3ca27a','blue':'#4a8fd1','purple':'#a77ad8'};
// Consistent colour groups for both Notes and To Do. Uncoloured items follow the chosen colours.
const COLOR_ORDER=['red','orange','yellow','green','blue','purple','none'];
function colorIndex(value){const i=COLOR_ORDER.indexOf(String(value||'none').toLowerCase());return i<0?COLOR_ORDER.length:i;}
function sortButtons(which,active,defaultName){return `<div class="sort-buttons" role="group" aria-label="Sort ${which}"><span class="sort-label">Sort:</span><button type="button" class="sort-button ${active==='colour'?'':'active'}" data-action="sort-${which}-default" aria-pressed="${active==='colour'?'false':'true'}">${defaultName}</button><button type="button" class="sort-button ${active==='colour'?'active':''}" data-action="sort-${which}-colour" aria-pressed="${active==='colour'?'true':'false'}">By colour</button></div>`;}
const FREQ=['one-time','daily','every 2 days','every 3 days','weekly','every 2 weeks','monthly','every 2 months','every 3 months','every 4 months','2x per year','yearly'];
function sumMacros(entries){const m=Object.fromEntries(MACRO_KEYS.map(k=>[k,0]));for(const e of entries||[])for(const k of MACRO_KEYS)m[k]+=n(e[k]);return m;}
function dailyMacros(){const day=data.foodLogs.filter(d=>d.date===today());return sumMacros(day.flatMap(d=>d.entries||[]));}
function waterToday(){return Math.max(0,n(data.water[today()]));}
function spendingDays(){const d=new Date(today()+'T12:00:00');const target=new Date(d.getFullYear(),d.getMonth(),24,12);if(d.getDate()>24)target.setMonth(target.getMonth()+1);return {days:Math.max(1,Math.round((target-d)/86400000)+1),target:todayISO(target)};}
function todayISO(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function nutrientFor(name){return data.nutrients.find(v=>String(v.name||'').trim().toLocaleLowerCase()===String(name||'').trim().toLocaleLowerCase());}
function recipeMacros(recipe){const result=Object.fromEntries(MACRO_KEYS.map(k=>[k,0]));let incomplete=0;for(const ing of (recipe.ingredients||[])){const ref=nutrientFor(ing.name);if(!ref||!['g','ml'].includes(ing.unit)||!(n(ing.amount)>0)){incomplete++;continue;}for(const k of MACRO_KEYS)result[k]+=n(ref[k])*n(ing.amount)/100;}return {...result,incomplete,complete:incomplete===0&&(recipe.ingredients||[]).length>0};}
function macroTiles(m){return `<div class="macro-grid">${[['calories','Calories','kcal'],['protein','Protein','g'],['carbs','Carbs','g'],['fat','Fat','g'],['fiber','Fiber','g']].map(([key,label,unit])=>`<div class="macro-tile"><span>${label}</span><b>${fmtNumber(m[key],key==='calories'?0:1)}</b><small>${unit}</small></div>`).join('')}</div>`;}
function servingCount(r){return Math.max(1,Math.floor(n(r.servings)||1));}
function recipeMacroLine(r){const m=recipeMacros(r),servings=servingCount(r);return `<div class="recipe-macros"><strong>${m.complete?fmtNumber(m.calories/servings)+' kcal / serving':m.incomplete?'Macros incomplete':fmtNumber(m.calories/servings)+' kcal / serving'}</strong><span>${servings} serving${servings===1?'':'s'} · Per serving: P ${fmtNumber(m.protein/servings,1)}g · C ${fmtNumber(m.carbs/servings,1)}g · F ${fmtNumber(m.fat/servings,1)}g</span><small>Whole recipe: ${fmtNumber(m.calories)} kcal · P ${fmtNumber(m.protein,1)}g · C ${fmtNumber(m.carbs,1)}g · F ${fmtNumber(m.fat,1)}g</small>${m.incomplete?`<small>${m.incomplete} ingredient(s) need measured g/ml amounts or Nutrition values · totals shown are partial</small>`:''}</div>`;}

function saveShoppingChecks(){data.shoppingChecked=[...checkedShop];save();}
function dailyTarget(key){return Math.max(0,n(data.targets?.[key]));}
function goalProgress(label,current,key,unit='g'){
 const goal=dailyTarget(key),pct=goal?Math.max(0,Math.min(100,current/goal*100)):0;
 return `<div class="goal-meter"><div class="meter-head"><span>${esc(label)}</span><b>${fmtNumber(current,key==='calories'||key==='water'?0:1)} ${esc(unit)} <small>${goal?' / '+fmtNumber(goal,0)+' '+esc(unit):'· No target set'}</small></b></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>`;
}
function remainingBills(){const to=spendingDays().target;return (data.budget.bills||[]).filter(b=>!b.paid&&(!safeDate(b.due)||b.due<=to));}
function budgetAllowance(){const period=spendingDays(),bills=remainingBills(),reserved=bills.reduce((s,b)=>s+Math.max(0,n(b.amount)),0),available=n(data.budget.balance)-reserved;return {...period,bills,reserved,available,perDay:available/period.days};}
function goalsForm(){modal('Your daily targets',[inputField('calories','Calories (kcal)',dailyTarget('calories'),'number',{step:'any'}),inputField('protein','Protein (g)',dailyTarget('protein'),'number',{step:'any'}),inputField('carbs','Carbohydrates (g)',dailyTarget('carbs'),'number',{step:'any'}),inputField('fat','Fat (g)',dailyTarget('fat'),'number',{step:'any'}),inputField('fiber','Fibre (g)',dailyTarget('fiber'),'number',{step:'any'}),inputField('water','Water (ml)',dailyTarget('water'),'number',{step:'any'})],o=>{for(const k of [...MACRO_KEYS,'water']){if(o[k]<0||!Number.isFinite(o[k])){toast('Targets must be zero or positive.');return false;}data.targets[k]=o[k];}toast('Daily targets updated.');});}
function dueCount(){return data.todo.filter(t=>!t.completed&&diffDays(t.due)!==null&&diffDays(t.due)<=0).length;}
function newestNote(){
 // New/edited notes use an ISO timestamp; older backups keep their existing order.
 return data.notes.map((note,index)=>({note,index,stamp:Date.parse(note.updatedAt||'')||0}))
  .sort((a,b)=>b.stamp-a.stamp||b.index-a.index)[0]?.note||null;
}
function dashboard(){
 const outstanding=data.todo.filter(t=>!t.completed),upcoming=data.events.filter(e=>safeDate(e.date)&&e.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
 const hasData=data.recipes.length+data.todo.length+data.events.length+data.nutrients.length+data.foodLogs.length+data.notes.length+data.shoppingFoods.length>0;
 const daily=dailyMacros(),allowance=budgetAllowance(),latestNote=newestNote();
 const latestNoteHtml=latestNote?`<button type="button" class="home-recent-note" data-action="open-home-note" data-id="${esc(latestNote.id)}" aria-label="Open note ${esc(latestNote.title)}"><span class="note-home-color" style="background:${NOTE_COLORS[latestNote.color]||NOTE_COLORS.none}"></span><span class="home-recent-note-content"><strong>${esc(latestNote.title||'Untitled note')}</strong><small>${latestNote.updatedAt?'Edited '+new Date(latestNote.updatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Latest saved note'}${latestNote.secure?' · Password protected':''}</small></span><span aria-hidden="true" class="note-chevron">›</span></button>`:'<p class="muted">No notes yet. Add a text note or checklist.</p>';
 return `<div class="home-title"><div><p class="eyebrow">YOUR DAY · ${prettyDate(today())}</p><h1 class="hero-title">Today at a glance</h1><p class="tiny">Your water, food, tasks and latest note in one place.</p></div>${btn('⚙ Daily targets','edit-targets','secondary')}</div>
 ${!hasData?'<div class="notice" style="margin-bottom:18px">Nothing personal has been loaded yet. Import your private JSON files in <a href="#settings"><b>Data & settings</b></a>, or start adding items.</div>':''}
 <div class="grid two home-trackers"><section class="card"><div class="flex-between"><h2>Water tracker</h2><span class="tag accent">Today</span></div><div class="water-total">${fmtNumber(waterToday())} <small>ml</small></div>${goalProgress('Water',waterToday(),'water','ml')}<div class="actions" style="margin-top:18px">${btn('+ 250 ml','water-250')}${btn('+ 500 ml','water-500','secondary')}${btn('− 250 ml','water-minus','small light')}</div></section>
 <section class="card"><div class="flex-between"><h2>Today's macros</h2><a class="tiny" href="#logs">Food log →</a></div>${goalProgress('Calories',daily.calories,'calories','kcal')}<div class="home-macro-details">${goalProgress('Protein',daily.protein,'protein')}${goalProgress('Carbs',daily.carbs,'carbs')}${goalProgress('Fat',daily.fat,'fat')}${goalProgress('Fibre',daily.fiber,'fiber')}</div></section></div>
 <div class="grid four stats" aria-label="Your overview"><a class="card stat stat-link" href="#todo"><div class="label">Tasks due or overdue</div><div class="number">${dueCount()}</div><div class="foot">${outstanding.length} open total</div></a><a class="card stat stat-link" href="#budget"><div class="label">Available per day</div><div class="number money-number">${fmtMoney(allowance.perDay)}</div><div class="foot">After ${fmtMoney(allowance.reserved)} in unpaid bills · until ${prettyDate(allowance.target)}</div></a><a class="card stat stat-link" href="#meals"><div class="label">Recipes</div><div class="number">${data.recipes.length}</div><div class="foot">${data.selectedMeals.length} added to shopping</div></a><a class="card stat stat-link" href="#events"><div class="label">Upcoming events</div><div class="number">${upcoming.length}</div><div class="foot">${upcoming.length?prettyDate(upcoming[0].date):'None planned'}</div></a></div>
 <section class="card home-tasks"><div class="flex-between"><h2>Next tasks</h2><a href="#todo" class="tiny">All tasks →</a></div>${outstanding.length?outstanding.slice().sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,4).map(t=>`<div class="shop-line"><span><b>${esc(t.text)}</b><div class="tiny">${prettyDate(t.due)}</div></span>${dueChip(t)}</div>`).join(''):'<p class="muted">No pending tasks.</p>'}</section>
 <section class="card home-latest-note"><div class="flex-between"><h2>Most recently edited note</h2><a href="#notes" class="tiny">All notes →</a></div>${latestNoteHtml}</section>`;
}
function taskForm(task){
 const t=task||{};
 const current=String(t.frequency||'one-time');
 const customMatch=current.match(/^every (\d+) days?$/i)||current.match(/^(\d+)$/);
 const isCustom=!FREQ.includes(current)&&Boolean(customMatch);
 const chosen=isCustom?'custom-days':current;
 const choices=[...FREQ,'custom-days'];
 if(!choices.includes(chosen))choices.push(chosen); // Keep unusual imported recurrence labels editable.
 const customDays=isCustom?Number(customMatch[1]):7;
 const frequencyField=inputField('frequency','Repeat frequency',chosen,'select',{choices}).replace('>custom-days</option>','>Custom — every N days</option>');
 const customField=`<label class="input-label custom-repeat-field" id="custom-repeat-wrap" ${!isCustom?'hidden':''}>Repeat every (days)<input class="field" type="number" min="1" max="36500" step="1" data-field="repeatDays" value="${esc(customDays)}" aria-label="Custom repetition interval in days"><span class="form-help">For example, enter 10 to repeat every 10 days.</span></label>`;
 modal(task?'Edit task':'New task',[
 inputField('text','Task description',t.text||'','text',{required:true,wide:true}),
 inputField('due','Next due date',t.due||today(),'date'),
 frequencyField,
 customField,
 inputField('color','Colour label',t.color||'none','select',{choices:Object.keys(TASK_COLORS)}),
 inputField('lastCompleted','Last completed',t.lastCompleted||'','date'),
 inputField('notes','Notes',t.notes||'','textarea',{wide:true})
 ],o=>{
  if(!o.text.trim()){toast('Enter a task description.');return false;}
  if(o.frequency==='custom-days'){
   const days=Number(o.repeatDays);
   if(!Number.isInteger(days)||days<1||days>36500){toast('Enter a whole number of days from 1 to 36500.');return false;}
   o.frequency='every '+days+' '+(days===1?'day':'days');
  }
  delete o.repeatDays;
  if(task)Object.assign(task,o);else data.todo.unshift({id:id(),...o,completed:false});
  toast('Task saved.');
 });
 const frequencySelect=DIALOG_CONTENT.querySelector('[data-field="frequency"]');
 const customWrap=DIALOG_CONTENT.querySelector('#custom-repeat-wrap');
 const customInput=customWrap.querySelector('[data-field="repeatDays"]');
 const setCustomVisibility=()=>{customWrap.hidden=frequencySelect.value!=='custom-days';customInput.required=!customWrap.hidden;};
 frequencySelect.addEventListener('change',setCustomVisibility);
 setCustomVisibility();
}
function todoView(){const q=filter.taskSearch.toLowerCase();const tasks=data.todo.filter(t=>{const days=diffDays(t.due);if(filter.tasks==='due'&&(t.completed||days===null||days>0))return false;if(filter.tasks==='due7'&&(t.completed||days===null||days>7))return false;return (t.text+' '+(t.notes||'')).toLowerCase().includes(q);}).sort((a,b)=>Number(a.completed)-Number(b.completed)||(filter.taskSort==='colour'?colorIndex(a.color)-colorIndex(b.color):0)||(a.due||'9999').localeCompare(b.due||'9999')||String(a.text||'').localeCompare(String(b.text||'')));return headline('PLANNER','To Do','Colour-coded tasks with repeat rules and due-date views.',btn('+ New task','new-task'))+`<div class="toolbar"><input class="search" data-filter="taskSearch" placeholder="Search tasks…" value="${esc(filter.taskSearch)}"><select class="select" aria-label="Task due filter" data-filter="tasks"><option value="due" ${filter.tasks==='due'?'selected':''}>Due & overdue</option><option value="due7" ${filter.tasks==='due7'?'selected':''}>Due + next 7 days</option><option value="all" ${filter.tasks==='all'?'selected':''}>All tasks</option></select>${btn('Import To Do','import-todo','secondary')}${sortButtons('todo',filter.taskSort,'Due date')}</div><p class="tiny">${tasks.length} shown · Undated tasks appear under All tasks. Completed tasks also appear under All tasks.</p>${tasks.length?`<div class="row-list">${tasks.map(t=>`<article class="list-row ${t.completed?'task-done':''} color-task" style="--task-color:${TASK_COLORS[t.color]||TASK_COLORS.none}"><button type="button" class="circle-action" aria-label="${t.completed?'Reopen':'Complete'} ${esc(t.text)}" data-action="toggle-task" data-id="${esc(t.id)}">${t.completed?'↶':'✓'}</button><div class="grow"><div class="item-title"><span class="task-color" style="background:${TASK_COLORS[t.color]||TASK_COLORS.none}" aria-label="${esc(t.color||'none')}"></span>${esc(t.text)}</div><div class="item-sub">${prettyDate(t.due)} · ${esc(t.frequency||'one-time')}${t.notes?' · '+esc(t.notes):''}</div></div>${dueChip(t)}<div class="row-actions">${btn('Edit','edit-task','small light',t.id)}${btn('×','delete-task','small danger',t.id)}</div></article>`).join('')}</div>`:empty('✓','No tasks in this view','Choose All tasks to see future, completed, and undated tasks, or add a new one.',btn('+ Add a task','new-task'))}`;}
function budgetForm(line){modal(line?'Edit monthly item':'New monthly item',[inputField('name','Description',line?.name||'','text',{wide:true,required:true}),inputField('amount','Monthly amount (positive = income; negative = cost)',line?.amount??0,'number',{step:'any',wide:true})],o=>{if(!o.name.trim()){toast('Add a description.');return false;}if(line)Object.assign(line,o);else data.budget.monthly.push({id:id(),...o});});}
function billForm(bill){modal(bill?'Edit upcoming bill':'Add bill to reserve',[inputField('name','Bill description',bill?.name||'','text',{required:true,wide:true}),inputField('amount','Amount to pay (positive)',bill?.amount??0,'number',{step:'any'}),inputField('due','Due date',bill?.due||today(),'date'),inputField('status','Status',bill?.paid?'Paid':'Unpaid','select',{choices:['Unpaid','Paid']})],o=>{if(!o.name.trim()){toast('Enter a bill name.');return false;}if(!(o.amount>0)||!safeDate(o.due)){toast('Enter a positive amount and a due date.');return false;}const value={name:o.name.trim(),amount:o.amount,due:o.due,paid:o.status==='Paid'};if(bill)Object.assign(bill,value);else data.budget.bills.push({id:id(),...value});});}
function budgetView(){const b=data.budget,net=b.monthly.reduce((s,v)=>s+n(v.amount),0),income=b.monthly.filter(v=>n(v.amount)>0).reduce((s,v)=>s+n(v.amount),0),costs=b.monthly.filter(v=>n(v.amount)<0).reduce((s,v)=>s+n(v.amount),0),span=budgetAllowance();
 return headline('MONEY','Budget','Current balance, unpaid bills and a daily allowance through the next 24th.',`${btn('Update balance','edit-balance','secondary')}${btn('+ Upcoming bill','new-bill')}`)+`
 <div class="grid three stats"><div class="card stat"><div class="label">Current balance</div><div class="balance">${fmtMoney(b.balance)}</div><div class="foot">Last updated ${prettyDate(b.balanceDate)}</div></div><div class="card stat"><div class="label">Reserved for unpaid bills</div><div class="balance">${fmtMoney(span.reserved)}</div><div class="foot">${span.bills.length} due through ${prettyDate(span.target)} (overdue included)</div></div><div class="card stat"><div class="label">Available to spend each day</div><div class="balance ${span.perDay<0?'total-neg':''}">${fmtMoney(span.perDay)}</div><div class="foot">(${fmtMoney(b.balance)} − ${fmtMoney(span.reserved)}) ÷ ${span.days} days, including today</div></div></div>
 <section class="card"><div class="flex-between"><h2>Upcoming bills</h2>${btn('+ Add bill','new-bill','small secondary')}</div><p class="tiny">Only unpaid bills due on or before ${prettyDate(span.target)} are reserved. Mark a bill as paid <b>and update your balance</b> after the payment is reflected in your account, to avoid double counting.</p>${b.bills.length?b.bills.slice().sort((x,y)=>Number(x.paid)-Number(y.paid)||(x.due||'').localeCompare(y.due||'')).map(x=>`<div class="shop-line bill-row"><span><b class="${x.paid?'checked-text':''}">${esc(x.name)}</b><div class="tiny">Due ${prettyDate(x.due)} · ${x.paid?'Paid':'Unpaid'}</div></span><strong>${fmtMoney(x.amount)}</strong><div class="row-actions">${btn(x.paid?'Reopen':'Mark paid','toggle-bill','small secondary',x.id)}${btn('Edit','edit-bill','small light',x.id)}${btn('×','delete-bill','small danger',x.id)}</div></div>`).join(''):'<p class="muted">No upcoming bills added. Your allowance currently uses the full balance.</p>'}</section>
 <section class="card"><div class="flex-between"><h2>Monthly income & costs</h2>${btn('+ Monthly item','new-budget','small secondary')}</div><p class="tiny">Monthly items are reference figures. Only the dated unpaid bills above reduce the daily allowance, so costs are not subtracted twice.</p>${b.monthly.length?b.monthly.map(item=>`<div class="shop-line"><span><b>${esc(item.name)}</b></span><strong class="${n(item.amount)<0?'total-neg':'total-pos'}">${fmtMoney(item.amount)}</strong>${btn('Edit','edit-budget','small light',item.id)}${btn('×','delete-budget','small danger',item.id)}</div>`).join(''):'<p class="muted">No monthly entries yet.</p>'}<div class="flex-between" style="padding-top:17px"><strong>Monthly net</strong><strong>${fmtMoney(net)}</strong></div><div class="tiny">Income ${fmtMoney(income)} · Costs ${fmtMoney(Math.abs(costs))}</div></section>`;}
function eventForm(item){modal(item?'Edit event':'Add event',[inputField('name','Event title',item?.name||'','text',{required:true,wide:true}),inputField('date','Event date',item?.date||today(),'date'),inputField('location','Location',item?.location||'','text'),inputField('dateNote','Other date label (for older entries)',item?.dateNote||'','text'),inputField('notes','Notes',item?.notes||'','textarea',{wide:true})],o=>{if(!o.name.trim()){toast('Enter event title.');return false;}if(item)Object.assign(item,o);else data.events.push({id:id(),...o});});}
function eventsView(){const q=filter.eventSearch.toLowerCase();const filtered=data.events.filter(e=>(filter.events==='all'||filter.events==='upcoming'&&e.date>=today()||filter.events==='past'&&(!e.date||e.date<today()))&&(e.name+' '+e.location).toLowerCase().includes(q)).sort((a,b)=>(filter.events==='upcoming'?1:-1)*(a.date||'').localeCompare(b.date||''));return headline('CALENDAR','Events','Concerts, shows, plans, and past experiences from your workbook.',btn('+ Add event','new-event'))+`<div class="toolbar"><input class="search" data-filter="eventSearch" value="${esc(filter.eventSearch)}" placeholder="Find an event or place…"><select class="select" data-filter="events"><option value="all" ${filter.events==='all'?'selected':''}>All events</option><option value="upcoming" ${filter.events==='upcoming'?'selected':''}>Upcoming</option><option value="past" ${filter.events==='past'?'selected':''}>Past</option></select></div>${filtered.length?`<div class="row-list">${filtered.map(e=>`<div class="list-row"><div class="grow"><div class="item-title">${esc(e.name)}</div><div class="item-sub">${esc(e.location||'No location')} · ${prettyDate(e.date||e.dateNote)}</div></div><div class="row-actions">${btn('Edit','edit-event','small light',e.id)}${btn('×','delete-event','small danger',e.id)}</div></div>`).join('')}</div>`:empty('▦','No events here','Add a new event, change the filter, or import your personal data file.')}`;}
function recipeForm(recipe){const r=recipe||{};const entries=(r.ingredients||[]).map(v=>({...v,unit:v.unit||'legacy'}));if(!entries.length)entries.push({amount:100,unit:'g',name:''});
const options=data.nutrients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<option value="${esc(x.name)}"></option>`).join('');
const rowHTML=(i,v)=>`<div class="ingredient-row" data-ingredient-row><label class="input-label">Amount<input class="field ing-amount" type="number" min="0" step="any" value="${esc(v.amount??'')}"></label><label class="input-label">Unit<select class="field ing-unit"><option value="g" ${v.unit==='g'?'selected':''}>grams (g)</option><option value="ml" ${v.unit==='ml'?'selected':''}>millilitres (ml)</option>${v.unit==='legacy'?'<option selected value="legacy">Unspecified (imported)</option>':''}</select></label><label class="input-label ingredient-name">Ingredient<input class="field ing-name" list="nutrient-names" placeholder="Start typing…" value="${esc(v.name||'')}"></label><button type="button" class="btn small light remove-ingredient" aria-label="Remove ingredient">×</button></div>`;
DIALOG_CONTENT.innerHTML=`<h2>${recipe?'Edit recipe':'New recipe'}</h2><div class="form-grid">${inputField('name','Recipe name',r.name||'','text',{required:true,wide:true})}${inputField('category','Category',r.category||'vegi','select',{choices:[...new Set(['vegi','chicken','meat','fish','breakfast','other',...data.recipes.map(x=>x.category).filter(Boolean)])]})}${inputField('mealType','Meal type',r.mealType||'Dinner','select',{choices:['Breakfast','Lunch','Dinner','Lunch & Dinner','Snack','Any meal']})}${inputField('servings','Servings made by this recipe',r.servings??1,'number',{step:'1'})}</div><div class="section-head"><h2>Ingredients</h2><span class="tiny">Nutrition reference required</span></div><datalist id="nutrient-names">${options}</datalist><div id="ingredient-rows" class="ingredient-editor">${entries.map((v,i)=>rowHTML(i,v)).join('')}</div><p class="tiny">Nutrition values are entered in Nutrition first. They are treated as values per 100 g or 100 ml. Original recipes with unspecified units need updating for reliable macro totals.</p><div class="actions" style="margin-top:10px"><button type="button" class="btn secondary small" id="add-ingredient">+ Ingredient</button><a class="tiny" href="#nutrition" id="recipe-nutrition-link">Add nutrition values first →</a></div><div id="recipe-error" class="form-error" role="alert"></div><div class="dialog-actions"><button class="btn light" type="button" id="modal-cancel">Cancel</button><button class="btn" type="submit">Save recipe</button></div>`;
const rows=DIALOG_CONTENT.querySelector('#ingredient-rows');DIALOG_CONTENT.querySelector('#add-ingredient').onclick=()=>{rows.insertAdjacentHTML('beforeend',rowHTML(0,{amount:100,unit:'g',name:''}));rows.lastElementChild.querySelector('.ing-name').focus();};rows.addEventListener('click',e=>{if(e.target.closest('.remove-ingredient')){e.target.closest('[data-ingredient-row]').remove();}});
DIALOG_CONTENT.querySelector('#recipe-nutrition-link').onclick=()=>{DIALOG.close();};DIALOG_CONTENT.querySelector('#modal-cancel').onclick=()=>DIALOG.close();
EDIT_FORM.onsubmit=e=>{e.preventDefault();const value=k=>DIALOG_CONTENT.querySelector(`[data-field="${k}"]`)?.value?.trim()||'';const name=value('name');const error=DIALOG_CONTENT.querySelector('#recipe-error');if(!name){error.textContent='Enter a recipe name.';return;}const ingredients=[...rows.querySelectorAll('[data-ingredient-row]')].map(row=>({amount:Number(row.querySelector('.ing-amount').value),unit:row.querySelector('.ing-unit').value,name:row.querySelector('.ing-name').value.trim()})).filter(v=>v.name);if(!ingredients.length){error.textContent='Add at least one ingredient.';return;}
for(const ing of ingredients){if(!nutrientFor(ing.name)){error.textContent=`“${ing.name}” is missing from Nutrition. Add its nutritional values in the Nutrition section first, then save the recipe.`;return;}if(ing.unit!=='legacy'&&!(ing.amount>0)){error.textContent=`Enter an amount greater than zero for ${ing.name}.`;return;}}
const servings=Number(value('servings'));if(!Number.isInteger(servings)||servings<1){error.textContent='Enter a whole number of servings (at least 1).';return;}const newName=name;if(recipe){if(recipe.name!==newName)data.selectedMeals=data.selectedMeals.map(x=>x===recipe.name?newName:x);Object.assign(recipe,{name,category:value('category'),mealType:value('mealType'),servings,ingredients});}else data.recipes.push({id:id(),name,category:value('category'),mealType:value('mealType'),servings,ingredients});save();DIALOG.close();render();toast('Recipe saved with nutrition references.');};
DIALOG.showModal();DIALOG_CONTENT.querySelector('[data-field="name"]').focus();}
function mealsView(){const cats=[...new Set(data.recipes.map(r=>r.category).filter(Boolean))].sort();const q=filter.recipes.toLowerCase();const found=data.recipes.filter(r=>{const m=recipeMacros(r);if(filter.recipeCat!=='all'&&!(filter.recipeCat==='selected'&&data.selectedMeals.includes(r.name))&&r.category!==filter.recipeCat)return false;if(filter.recipeMin!==''&&(!m.complete||m.calories/servingCount(r)<n(filter.recipeMin)))return false;if(filter.recipeMax!==''&&(!m.complete||m.calories/servingCount(r)>n(filter.recipeMax)))return false;return (r.name+' '+r.mealType+' '+(r.ingredients||[]).map(i=>i.name).join(' ')).toLowerCase().includes(q);}).sort((a,b)=>a.name.localeCompare(b.name));
const randomCards=randomizedRecipes.map(key=>data.recipes.find(r=>r.id===key)).filter(Boolean);return headline('MEAL PLANNER','Meals & recipes','Choose meals, filter by calories or pick three at random.',btn('+ New recipe','new-recipe'))+`<div class="toolbar"><input class="search" placeholder="Search recipes or ingredients…" data-filter="recipes" value="${esc(filter.recipes)}"><select class="select" data-filter="recipeCat"><option value="all">All categories</option><option value="selected" ${filter.recipeCat==='selected'?'selected':''}>Selected (${data.selectedMeals.length})</option>${cats.map(c=>`<option value="${esc(c)}" ${filter.recipeCat===c?'selected':''}>${esc(c)}</option>`).join('')}</select><label class="filter-number">Min kcal / serving<input class="field" type="number" min="0" step="1" data-filter="recipeMin" value="${esc(filter.recipeMin)}" placeholder="0"></label><label class="filter-number">Max kcal / serving<input class="field" type="number" min="0" step="1" data-filter="recipeMax" value="${esc(filter.recipeMax)}" placeholder="Any"></label>${btn('Shopping list','nav-shopping','secondary')}</div>
<section class="card random-card"><div class="flex-between"><div><h2>Surprise me with 3 recipes</h2><p class="tiny">Random selections can be added directly to your shopping list.</p></div>${btn('🎲 Pick 3 recipes','random-recipes')}</div>${randomCards.length?`<div class="random-recipes">${randomCards.map(r=>`<div><b>${esc(r.name)}</b>${recipeMacroLine(r)}</div>`).join('')}</div><div class="actions" style="margin-top:12px">${btn('Add these to shopping list','add-random-recipes','secondary')}</div>`:''}</section>
<div class="section-head"><h2>Recipe library</h2><span class="tiny">${found.length} matching recipes</span></div>${found.length?`<div class="recipe-list">${found.map(r=>`<article class="recipe-card ${data.selectedMeals.includes(r.name)?'selected':''}"><span class="tag">${esc(r.category||'Recipe')}</span><h3 class="recipe-title" style="margin-top:11px">${esc(r.name)}</h3><div class="tiny">${esc(r.mealType||'Any meal')} · ${servingCount(r)} serving(s) · ${(r.ingredients||[]).length} ingredients</div>${recipeMacroLine(r)}<details class="recipe-ingredients"><summary>View ingredients</summary><ul>${(r.ingredients||[]).map(i=>`<li>${fmtNumber(i.amount,2)} ${i.unit&&i.unit!=='legacy'?esc(i.unit):'(unit not set)'} ${esc(i.name)}</li>`).join('')}</ul></details><div class="recipe-foot"><button type="button" data-action="toggle-recipe" data-id="${esc(r.id)}" class="check-button ${data.selectedMeals.includes(r.name)?'active':''}">${data.selectedMeals.includes(r.name)?'✓ Selected':'+ Add to shopping'}</button>${btn('Log','log-recipe','small secondary',r.id)}${btn('Edit','edit-recipe','small light',r.id)}${btn('×','delete-recipe','small danger',r.id)}</div></article>`).join('')}</div>`:empty('◉','No matching recipes','Add recipes with Nutrition references, or adjust calorie filters.')}`;}
function shopList(){
 const m=new Map(),missingNutrition=new Set();
 for(const recipeName of data.selectedMeals){
  const recipe=data.recipes.find(x=>x.name===recipeName);if(!recipe)continue;
  for(const ing of (recipe.ingredients||[])){
   const name=String(ing.name||'').trim();if(!name)continue;
   if(!nutrientFor(name)){missingNutrition.add(name);continue;}
   const unit=ing.unit||'legacy';const key=name.toLocaleLowerCase()+'|'+unit;
   if(!m.has(key))m.set(key,{key,name,unit,amount:0,count:0});
   const v=m.get(key);v.amount+=n(ing.amount);v.count++;
  }
 }
 return {needed:[...m.values()].sort((a,b)=>a.name.localeCompare(b.name)),missingNutrition:[...missingNutrition].sort((a,b)=>a.localeCompare(b)),foods:data.shoppingFoods,extras:data.extras.filter(x=>x.selected).sort((a,b)=>a.name.localeCompare(b.name))};
}
function extraForm(item){modal(item?'Edit other item':'New other shopping item',[inputField('name','Item name',item?.name||'','text',{wide:true,required:true}),inputField('category','Category',item?.category||'other','text')],o=>{if(!o.name.trim())return false;if(item)Object.assign(item,o);else data.extras.push({id:id(),...o,selected:true});});}
function shoppingView(){
 const {needed,missingNutrition,foods,extras}=shopList(),cats=[...new Set([...data.extras.map(x=>x.category||'other'),'other'])].sort();
 const byCat=Object.fromEntries(cats.map(c=>[c,data.extras.filter(x=>(x.category||'other')===c).sort((a,b)=>a.name.localeCompare(b.name))]));
 const rows=[
  ...needed.map(v=>{const ref=nutrientFor(v.name);return {...v,category:ref?.category||'Uncategorized ingredients',key:'ing:'+v.key,origin:'recipe'};}),
  ...foods.map(v=>{const ref=data.nutrients.find(x=>x.id===v.nutritionId)||nutrientFor(v.name);return {...v,name:ref?.name||v.name,category:ref?.category||'Missing Nutrition reference',key:'food:'+v.id,origin:'nutrition',missingReference:!ref};}),
  ...extras.map(x=>({...x,key:'extra:'+x.id,origin:'extra'}))
 ];
 const pending=rows.filter(x=>!checkedShop.has(x.key)),bought=rows.filter(x=>checkedShop.has(x.key));
 const grouped=(items)=>{const groups=items.reduce((obj,x)=>{const key=x.category||'Other';(obj[key]??=[]).push(x);return obj;},{});return Object.keys(groups).sort((a,b)=>a.localeCompare(b)).map(cat=>`<div class="shopping-group"><h3>${esc(cat)} <small>${groups[cat].length} item(s)</small></h3>${groups[cat].slice().sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<div class="shop-line shop-item-row"><label class="shop-item-label"><input class="plain-check" type="checkbox" data-shop-check="${esc(x.key)}" ${checkedShop.has(x.key)?'checked':''}><span class="${checkedShop.has(x.key)?'checked-text':''}">${esc(x.name)}${x.missingReference?' ⚠ Nutrition reference missing':''}</span></label>${x.origin==='recipe'?`<span class="qty">${fmtNumber(x.amount,2)} ${x.unit==='legacy'?'(unit unspecified)':esc(x.unit)}</span>`:x.origin==='nutrition'?`<span class="qty">${fmtNumber(x.amount,2)} ${esc(x.unit||'pcs')}</span>${btn('×','remove-shopping-food','small light',x.id)}`:'<span class="tag">Other</span>'}</div>`).join('')}</div>`).join('');};
 const nutritionOptions=data.nutrients.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).map(v=>`<option value="${esc(v.name)}"></option>`).join('');
 return headline('LISTS','Shopping','Unchecked items first; purchased items stay below and can be unchecked for next time.',`${btn('+ Other item','new-extra')}${btn('Choose meals','nav-meals','secondary')}`)+`
 <div class="grid two"><section class="card"><div class="flex-between"><h2>Shopping checklist</h2><span class="tag accent">${pending.length} left / ${rows.length} items</span></div><p class="tiny">Foods are selected from Nutrition. Recipe ingredients also use Nutrition references. Other non-food items can be entered freely.</p>
 ${pending.length?grouped(pending):empty('✓','All done!','There are no unchecked shopping items.')}
 ${missingNutrition.length?`<div class="notice" role="status">${missingNutrition.length} selected-recipe ingredient(s) aren't in Nutrition yet: <b>${missingNutrition.map(x=>esc(x)).join(', ')}</b>. Add them under Nutrition to include them in the checklist.</div>`:''}
 ${bought.length?`<div class="bought-section"><h3>✓ Already bought (${bought.length})</h3><p class="tiny">Uncheck an item below whenever you need it again.</p>${grouped(bought)}</div>`:''}
 <div class="actions" style="margin-top:18px">${btn('Uncheck everything','clear-shop-checks','small light')}${btn('Export list','export-shopping','small secondary')}</div></section>
 <div class="shopping-tools-column"><section class="card"><h2>Food from Nutrition</h2><p class="tiny">Start typing and choose an existing Nutrition ingredient or product. New food products must be added in Nutrition first.</p>
 <form class="shop-food-form" id="shop-food-form"><label class="input-label">Food product<input class="field" id="shopping-food-name" list="shopping-nutrition-names" placeholder="Search saved Nutrition…" required autocomplete="off"></label><datalist id="shopping-nutrition-names">${nutritionOptions}</datalist><div class="shop-food-amount"><label class="input-label">Quantity<input class="field" id="shopping-food-amount" type="number" min="0.01" step="any" value="1" required></label><label class="input-label">Unit<select class="field" id="shopping-food-unit"><option value="pcs">pieces</option><option value="g">grams</option><option value="ml">millilitres</option></select></label></div><button class="btn" type="submit">+ Add food to shopping</button></form><a class="tiny" href="#nutrition">Missing a product? Add its nutrition values first →</a></section>
 <section class="card"><div class="flex-between"><h2>Other shopping items</h2><span class="tag">${extras.length} selected</span></div><p class="tiny">Reusable non-food checklist: choose items by category or add free-text items below. Tick purchased items in the shopping list; they stay there to uncheck again later.</p>${cats.map(cat=>`<div class="shopping-category"><h3>${esc(cat)}</h3>${byCat[cat].map(x=>`<div class="extra-choice"><label><input type="checkbox" class="plain-check" data-extra-toggle="${esc(x.id)}" ${x.selected?'checked':''}><span>${esc(x.name)}</span></label>${btn('Edit','edit-extra','small light',x.id)}${btn('×','delete-extra','small danger',x.id)}</div>`).join('')}<div class="add-extra-row"><input class="field" data-category-input="${esc(cat)}" placeholder="Add new ${esc(cat)} item" aria-label="New ${esc(cat)} shopping item"><button type="button" class="btn small secondary" data-action="quick-extra" data-id="${esc(cat)}">Add</button></div></div>`).join('')}</section></div></div>
 <div class="section-head"><h2>Selected recipes</h2><span class="tiny">${data.selectedMeals.length} recipes</span></div><div class="pill-list">${data.selectedMeals.map(name=>`<span class="tag accent">${esc(name)}</span>`).join('')||'<span class="muted">No recipes selected.</span>'}</div>`;
}
// Optional note encryption: PBKDF2-SHA256 (310,000 iterations) + AES-256-GCM.
// Titles, type and colour are deliberately public; text and checklist entries are encrypted.
const NOTE_CRYPTO_ITERATIONS=310000;
const byteToBase64=(bytes)=>{let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);};
const base64ToByte=(value)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
function secureNotesAvailable(){return Boolean(window.isSecureContext&&window.crypto?.subtle&&window.crypto?.getRandomValues);}
function noteRandom(length){const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return bytes;}
async function noteKey(password,salt,iterations=NOTE_CRYPTO_ITERATIONS){
 const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptNoteContent(plain,key,existingSecure=null){
 const salt=existingSecure?existingSecure.salt:byteToBase64(noteRandom(16));
 const iv=noteRandom(12);
 const bytes=new TextEncoder().encode(JSON.stringify({content:String(plain.content||''),items:plain.items||[]}));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('Everything note v1')},key,bytes);
 return {version:1,method:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:existingSecure?.iterations||NOTE_CRYPTO_ITERATIONS,salt,iv:byteToBase64(iv),ciphertext:byteToBase64(new Uint8Array(ciphertext))};
}
async function protectNoteContent(plain,password){
 const salt=byteToBase64(noteRandom(16));
 const key=await noteKey(password,base64ToByte(salt));
 const secure=await encryptNoteContent(plain,key,{salt,iterations:NOTE_CRYPTO_ITERATIONS});
 return {secure,key};
}
async function decryptNoteContent(note,password){
 if(!secureNotesAvailable())throw new Error('Secure notes need HTTPS (your GitHub Pages website) and a browser with Web Crypto.');
 const sec=note.secure;
 if(!sec||sec.version!==1||sec.method!=='AES-256-GCM'||sec.kdf!=='PBKDF2-SHA256'||!Number.isInteger(sec.iterations)||sec.iterations<100000||sec.iterations>2000000)throw new Error('Unsupported encrypted note format.');
 if(base64ToByte(sec.salt).length!==16||base64ToByte(sec.iv).length!==12)throw new Error('Invalid encrypted note data.');
 const key=await noteKey(password,base64ToByte(sec.salt),sec.iterations);
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToByte(sec.iv),additionalData:new TextEncoder().encode('Everything note v1')},key,base64ToByte(sec.ciphertext));
 const plain=JSON.parse(new TextDecoder().decode(bytes));
 if(!plain||typeof plain.content!=='string'||!Array.isArray(plain.items))throw new Error('Invalid note contents.');
 return {content:plain.content,items:plain.items,key};
}
function openSecureNote(note,onSuccess){
 if(!secureNotesAvailable()){toast('Protected notes need HTTPS and a compatible browser.');return;}
 DIALOG_CONTENT.innerHTML=`<h2>Unlock note</h2><p class="tiny">${esc(note.title)} · Enter this note's password. Its title and colour are not encrypted.</p><label class="input-label wide">Note password<input type="password" class="field" id="note-unlock-password" required autocomplete="off" autofocus></label><p class="secure-note-error" role="alert" id="note-unlock-error"></p><div class="dialog-actions"><button type="button" class="btn light" id="modal-cancel">Cancel</button><button class="btn" type="submit" id="note-unlock-submit">Unlock</button></div>`;
 const form=EDIT_FORM;
 document.getElementById('modal-cancel').onclick=()=>DIALOG.close();
 form.onsubmit=async event=>{event.preventDefault();const button=document.getElementById('note-unlock-submit');button.disabled=true;document.getElementById('note-unlock-error').textContent='';try{
  const password=document.getElementById('note-unlock-password').value;
  const decrypted=await decryptNoteContent(note,password);
  unlockedNote={id:note.id,content:decrypted.content,items:decrypted.items,key:decrypted.key};
  activeNoteId=note.id;
  document.getElementById('note-unlock-password').value='';
  DIALOG.close();DIALOG_CONTENT.replaceChildren();render();
  if(onSuccess)onSuccess();
 }catch(err){document.getElementById('note-unlock-error').textContent='Could not unlock. Check the password (or the backup file).';button.disabled=false;}};
 DIALOG.showModal();document.getElementById('note-unlock-password').focus();
}
function noteForm(note){
 if(note?.secure&&unlockedNote?.id!==note.id){openSecureNote(note,()=>noteForm(note));return;}
 const existing=note||{title:'',type:'text',color:'none',content:'',items:[]};
 const plain=note?.secure?unlockedNote:existing;
 const prevItems=plain.items||[];
 DIALOG_CONTENT.innerHTML=`<h2>${note?'Edit note':'Create note or checklist'}</h2><div class="form-grid">
 ${inputField('title','Title',existing.title,'text',{required:true,wide:true})}
 ${inputField('type','Note type',existing.type,'select',{choices:['text','checklist']})}
 ${inputField('color','Colour label',NOTE_COLORS[existing.color]?existing.color:'none','select',{choices:Object.keys(NOTE_COLORS)})}
 ${inputField('content','General text',plain.content||'','textarea',{wide:true,help:'The text appears only when you open the note.'})}
 ${inputField('lines','Checklist items (one per line)',prevItems.map(x=>x.text).join('\n'),'textarea',{wide:true,help:'Items are displayed after opening the note.'})}
 <label class="input-label wide note-security-choice"><span><input id="note-protection" type="checkbox" ${existing.secure?'checked':''}> Password-protect this note</span><span class="form-help">Encrypts the text and checklist, including in JSON backups. Title and colour remain visible.</span></label>
 <div id="note-password-fields" class="note-password-fields wide" hidden>
  <label class="input-label">${existing.secure?'New password (optional)':'Password'}<input id="note-new-password" class="field" type="password" minlength="10" autocomplete="new-password" placeholder="At least 10 characters"></label>
  <label class="input-label">Confirm password<input id="note-confirm-password" class="field" type="password" autocomplete="new-password"></label>
  <span class="form-help">${existing.secure?'Leave both fields empty to keep your existing password.':'There is no password recovery. Store your password somewhere safe.'}</span>
 </div></div><p id="note-save-error" role="alert" class="secure-note-error"></p><div class="dialog-actions"><button type="button" class="btn light" id="modal-cancel">Cancel</button><button type="submit" class="btn" id="note-save-submit">Save note</button></div>`;
 const typeInput=DIALOG_CONTENT.querySelector('[data-field="type"]');
 const txt=DIALOG_CONTENT.querySelector('[data-field="content"]').closest('label');
 const checklist=DIALOG_CONTENT.querySelector('[data-field="lines"]').closest('label');
 const protection=document.getElementById('note-protection');
 const passwordFields=document.getElementById('note-password-fields');
 function sync(){txt.hidden=typeInput.value==='checklist';checklist.hidden=typeInput.value!=='checklist';passwordFields.hidden=!protection.checked;}
 typeInput.addEventListener('change',sync);protection.addEventListener('change',sync);sync();
 document.getElementById('modal-cancel').onclick=()=>DIALOG.close();
 EDIT_FORM.onsubmit=async event=>{
  event.preventDefault();const error=document.getElementById('note-save-error');error.textContent='';
  const submit=document.getElementById('note-save-submit');submit.disabled=true;
  try{
   const get=k=>DIALOG_CONTENT.querySelector(`[data-field="${k}"]`).value;
   const title=get('title').trim();if(!title)throw new Error('Enter a note title.');
   const type=get('type')==='checklist'?'checklist':'text';const color=NOTE_COLORS[get('color')]?get('color'):'none';
   const claimed=new Set();
   const items=get('lines').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(text=>{const oldIndex=prevItems.findIndex((it,i)=>!claimed.has(i)&&it.text===text);if(oldIndex>=0){claimed.add(oldIndex);return {...prevItems[oldIndex]};}return {id:id(),text,checked:false};});
   const contents={content:get('content'),items};
   const record={id:note?.id||id(),title,type,color,updatedAt:new Date().toISOString()};
   if(protection.checked){
    if(!secureNotesAvailable())throw new Error('Protected notes require HTTPS and a browser that supports encryption.');
    const pass=document.getElementById('note-new-password').value;
    const confirmPassword=document.getElementById('note-confirm-password').value;
    if(pass||confirmPassword||!existing.secure){
      if(pass.length<10)throw new Error('Use a password with at least 10 characters.');
      if(pass!==confirmPassword)throw new Error('Passwords do not match.');
      const result=await protectNoteContent(contents,pass);record.secure=result.secure;
    }else{
      if(unlockedNote?.id!==note.id||!unlockedNote.key)throw new Error('Unlock this note before editing.');
      record.secure=await encryptNoteContent(contents,unlockedNote.key,existing.secure);
    }
   }else{
    if(existing.secure&&!confirm('Remove password protection? This note will be stored in plain text and will be readable in future backups.')){submit.disabled=false;return;}
    record.content=contents.content;record.items=contents.items;
   }
   const index=note?data.notes.findIndex(x=>x.id===note.id):-1;
   const original=index>=0?data.notes[index]:null;
   if(index>=0)data.notes[index]=record;else data.notes.push(record);
   if(!save()){if(index>=0)data.notes[index]=original;else data.notes.pop();throw new Error('Could not save the note. Your previous data was kept.');}
   unlockedNote=null;activeNoteId=protection.checked?'':record.id;
   DIALOG.close();DIALOG_CONTENT.replaceChildren();
   if(route!=='notes')navigate('notes');else render();
   toast(protection.checked?'Encrypted note saved.':'Note saved.');
  }catch(err){error.textContent=err.message||'Note could not be saved.';submit.disabled=false;}
 };
 DIALOG.showModal();DIALOG_CONTENT.querySelector('[data-field="title"]').focus();
}
function notesView(){
 const q=filter.notes.toLocaleLowerCase();
 const selected=data.notes.find(x=>x.id===activeNoteId);
 if(selected){
  if(selected.secure&&unlockedNote?.id!==selected.id){lockOpenNote();return notesView();}
  const color=NOTE_COLORS[selected.color]||NOTE_COLORS.none;
  const content=selected.secure?unlockedNote:selected;
  const items=(content.items||[]).slice().sort((a,b)=>Number(Boolean(a.checked))-Number(Boolean(b.checked)));
  const body=selected.type==='checklist'?`<div class="note-checklist">${items.length?items.map(it=>`<label class="note-check"><input type="checkbox" data-note-check="${esc(selected.id+'::'+it.id)}" ${it.checked?'checked':''}><span class="${it.checked?'checked-text':''}">${esc(it.text)}</span></label>`).join(''):'<p class="tiny">No checklist items yet. Select Edit to add some.</p>'}</div><p class="tiny">${items.filter(x=>x.checked).length} of ${items.length} completed</p>`:`<div class="note-body">${esc(content.content||'No text yet.')}</div>`;
  return `<div class="note-detail-toolbar">${btn('← All notes','back-notes','light')}${selected.secure?btn('🔒 Lock','lock-note','light'):''}</div><article class="card note-card note-detail" style="--note-accent:${color}"><div class="note-head"><div><span class="note-type">${esc(selected.type==='checklist'?'Checklist':'Text note')}${selected.secure?' · Protected':''}</span><h2>${esc(selected.title)}</h2></div><span class="note-color-dot" title="${esc(selected.color||'none')}"></span></div>${body}<div class="note-actions">${btn('Edit','edit-note','small secondary',selected.id)}${btn('Delete','delete-note','small light',selected.id)}</div></article>`;
 }
 const notes=data.notes.filter(note=>[note.title,...(note.secure?[]:[note.content,...(note.items||[]).map(x=>x.text)])].join(' ').toLocaleLowerCase().includes(q)).slice().reverse();
 if(filter.noteSort==='colour')notes.sort((a,b)=>colorIndex(a.color)-colorIndex(b.color));
 const noteHtml=note=>{const color=NOTE_COLORS[note.color]||NOTE_COLORS.none;return `<article class="card note-card note-compact" style="--note-accent:${color}"><button type="button" class="note-open" data-action="open-note" data-id="${esc(note.id)}" aria-label="Open ${esc(note.title)}${note.secure?' (password required)':''}"><span class="note-compact-title">${esc(note.title)}</span><span class="note-compact-trailing"><span class="note-color-dot" title="${esc(note.color||'none')}"></span>${note.secure?'<span class="note-compact-lock" aria-label="Password protected">🔒</span>':''}<span aria-hidden="true" class="note-chevron">›</span></span></button></article>`;};
 return headline('MY SPACE','Notes','Tap a title to open a note. Optional passwords protect the contents.',btn('+ New note','new-note'))+`<div class="toolbar"><input class="search" data-filter="notes" value="${esc(filter.notes)}" placeholder="Search note titles…">${sortButtons('notes',filter.noteSort,'Recent')}</div>${notes.length?`<div class="notes-grid">${notes.map(noteHtml).join('')}</div>`:empty('▤','No notes found','Create a note or checklist. You can set a colour and an optional password.',btn('+ New note','new-note'))}`;
}
function nutrientForm(item){modal(item?'Edit nutrition reference':'New nutrition ingredient',[inputField('name','Ingredient name',item?.name||'','text',{required:true,wide:true}),inputField('category','Supermarket category (for shopping list)',item?.category||'Uncategorized ingredients','text',{wide:true}),...['protein','calories','fat','carbs','fiber'].map(k=>inputField(k,k[0].toUpperCase()+k.slice(1)+' per 100 g/ml',item?.[k]??0,'number',{step:'any'}))],o=>{const name=o.name.trim();if(!name)return false;o.category=o.category.trim()||'Uncategorized ingredients';if(data.nutrients.some(x=>x!==item&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase())){toast('An ingredient with that name already exists. Edit the existing entry.');return false;}if(item)Object.assign(item,{...o,name});else data.nutrients.push({id:id(),...o,name});});}
function nutritionView(){const q=filter.nutrients.toLowerCase();const items=data.nutrients.filter(x=>x.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));return headline('REFERENCE','Nutrition','The ingredient database used to calculate recipe macros.',btn('+ New ingredient','new-nutrient'))+`<div class="notice blue" style="margin-bottom:18px">Recipe entries must use a name from this reference list. Values are interpreted <b>per 100 g or 100 ml</b> to calculate recipes. Please confirm the units of imported Excel data, especially for items labeled by pieces or servings.</div><div class="toolbar"><input class="search" placeholder="Search ingredients…" data-filter="nutrients" value="${esc(filter.nutrients)}"></div>${items.length?`<div class="scroll-table"><table class="data-table"><thead><tr><th>Ingredient</th><th>Protein (g)</th><th>Calories</th><th>Fat (g)</th><th>Carbs (g)</th><th>Fiber (g)</th><th></th></tr></thead><tbody>${items.slice(0,150).map(x=>`<tr><td><b>${esc(x.name)}</b></td>${['protein','calories','fat','carbs','fiber'].map(k=>`<td>${fmtNumber(x[k],2)}</td>`).join('')}<td>${btn('Log','log-nutrient','small secondary',x.id)} ${btn('Edit','edit-nutrient','small light',x.id)}</td></tr>`).join('')}</tbody></table></div>${items.length>150?`<p class="tiny">Showing 150 of ${items.length}. Search to narrow results.</p>`:''}`:empty('♡','No ingredient references','Create a nutrient record before using it in a new recipe.')}`;}
// New food log items come from a Nutrition reference, a fully measured recipe, or explicitly entered manual macros.
// Recorded macros are snapshots, so editing a Nutrition reference later does not rewrite past diary entries.
function logEntryForm(day,item,prefill){
 const old=item||{};
 const inferredType=['ingredient','recipe','manual'].includes(old.entryType)?old.entryType:'manual';
 const kind=prefill?.kind||(item?inferredType:'ingredient');
 const referenceName=prefill?.kind==='ingredient'?(data.nutrients.find(v=>v.id===prefill.id)?.name||''):(inferredType==='ingredient'?(data.nutrients.find(v=>v.id===old.nutrientId)?.name||old.ingredient||''):'');
 const recipeId=prefill?.kind==='recipe'?prefill.id:old.recipeId||'';
 const sortedNutrients=data.nutrients.slice().sort((a,b)=>a.name.localeCompare(b.name));
 const sortedRecipes=data.recipes.slice().sort((a,b)=>a.name.localeCompare(b.name));
 const selectedRecipe=sortedRecipes.find(r=>r.id===recipeId);
 const modalChoice=(val,label)=>`<option value="${esc(val)}" ${kind===val?'selected':''}>${esc(label)}</option>`;
 DIALOG_CONTENT.innerHTML=`<h2>${item?'Edit food entry':'Add to Food Log'}</h2>
 <p class="tiny log-intro">Log a Nutrition ingredient, an entire recipe, or a separate manual macro entry. Values added to the diary count toward today's home-screen macros.</p>
 <div class="form-grid">
 ${inputField('date','Date',day?.date||today(),'date')}
 ${inputField('meal','Meal (optional)',old.meal||'','text')}
 <label class="input-label wide">Entry type<select class="field" id="log-entry-kind">${modalChoice('ingredient','Ingredient from Nutrition')}${modalChoice('recipe','Whole recipe')}${modalChoice('manual','Blank manual values')}</select></label>
 </div>
 <section class="log-mode-panel" data-log-panel="ingredient" ${kind!=='ingredient'?'hidden':''}>
 <p class="form-help">Select a name already saved under Nutrition. Ingredients not in Nutrition cannot be logged here.</p>
 <div class="form-grid"><label class="input-label wide">Nutrition ingredient<input class="field" id="log-nutrient-name" type="text" list="log-nutrients" autocomplete="off" placeholder="Search for a saved Nutrition ingredient" value="${esc(referenceName)}"></label>
 <datalist id="log-nutrients">${sortedNutrients.map(v=>`<option value="${esc(v.name)}"></option>`).join('')}</datalist>
 <label class="input-label">Amount<input class="field" id="log-nutrient-amount" type="number" min="0.01" step="any" value="${esc(inferredType==='ingredient'?old.amount||100:100)}"></label>
 <label class="input-label">Unit<select class="field" id="log-nutrient-unit"><option value="g" ${old.unit==='g'||old.unit!=='ml'?'selected':''}>grams (g)</option><option value="ml" ${old.unit==='ml'?'selected':''}>millilitres (ml)</option></select></label></div>
 <a href="#nutrition" class="log-reference-link" id="log-add-nutrition">+ Add a missing ingredient to Nutrition first →</a>
 </section>
 <section class="log-mode-panel" data-log-panel="recipe" ${kind!=='recipe'?'hidden':''}>
 <p class="form-help">Choose the number of servings you ate. Each recipe has an editable serving count in Meals.</p>
 <div class="form-grid"><label class="input-label wide">Search saved recipes<input class="field" id="log-recipe-search" type="search" autocomplete="off" placeholder="Type a recipe name, ingredient or category…" aria-controls="log-recipe-id"></label>
 <label class="input-label wide">Saved recipe<select class="field" id="log-recipe-id"><option value="">Choose a recipe…</option>${sortedRecipes.map(r=>`<option value="${esc(r.id)}" ${r.id===recipeId?'selected':''}>${esc(r.name)}</option>`).join('')}</select><span class="form-help" id="recipe-match-count" role="status">${sortedRecipes.length} recipes available. Search to narrow the list.</span></label>
 <label class="input-label wide">Servings eaten<input class="field" id="log-recipe-amount" type="number" min="0.01" step="any" value="${esc(inferredType==='recipe'?(old.unit==='recipe'?n(old.amount||1)*servingCount(selectedRecipe||{}):old.amount||1):1)}"></label></div>
 <p class="form-help">Only recipes with complete Nutrition references and measured g/ml ingredients can be logged. The saved macros are calculated per serving and multiplied by the portions chosen.</p>
 <a href="#meals" class="log-reference-link" id="log-edit-recipes">Review recipes and ingredients →</a>
 </section>
 <section class="log-mode-panel" data-log-panel="manual" ${kind!=='manual'?'hidden':''}>
 <p class="form-help">Use this separate option for estimates or adjustments when you want to type macro totals yourself. It does not create an ingredient in Nutrition.</p>
 <div class="form-grid">
 ${inputField('manualName','Description',inferredType==='manual'?old.ingredient||'':'','text',{wide:true})}
 ${inputField('manualAmount','Amount (optional)',inferredType==='manual'?old.amount??'':'','number',{step:'any'})}
 ${['calories','protein','carbs','fat','fiber'].map(k=>inputField('manual-'+k,k[0].toUpperCase()+k.slice(1)+(k==='calories'?' (kcal)':' (g)'),inferredType==='manual'?old[k]??0:0,'number',{step:'any'})).join('')}
 </div></section>
 <div id="log-macro-preview" class="log-macro-preview" role="status" aria-live="polite"></div>
 <div id="log-error" class="form-error" role="alert"></div>
 <div class="dialog-actions"><button class="btn light" type="button" id="modal-cancel">Cancel</button><button class="btn" type="submit">${item?'Save entry':'Add to Food Log'}</button></div>`;
 const el=id=>DIALOG_CONTENT.querySelector('#'+id);
 const field=name=>DIALOG_CONTENT.querySelector('[data-field=\"'+name+'\"]');
 const num=id=>Number((el(id)||field(id))?.value);
 const type=()=>el('log-entry-kind').value;
 const showError=message=>{el('log-error').textContent=message;return false;};
 const getSource=()=>{
  if(type()==='ingredient'){
   const ref=nutrientFor(el('log-nutrient-name').value.trim());
   const amount=num('log-nutrient-amount');
   if(!ref)return {error:'Choose an ingredient that exists in Nutrition. To add a new ingredient, open Nutrition first.'};
   if(!Number.isFinite(amount)||amount<=0)return {error:'Enter a positive gram or millilitre amount.'};
   const unit=el('log-nutrient-unit').value;
   if(!['g','ml'].includes(unit))return {error:'Choose grams or millilitres.'};
   const macros=Object.fromEntries(MACRO_KEYS.map(k=>[k,n(ref[k])*amount/100]));
   return {entryType:'ingredient',nutrientId:ref.id,ingredient:ref.name,amount,unit,...macros};
  }
  if(type()==='recipe'){
   const ref=data.recipes.find(r=>r.id===el('log-recipe-id').value);
   const amount=num('log-recipe-amount');
   if(!ref)return {error:'Choose a recipe from Meals.'};
   const totals=recipeMacros(ref);
   if(!totals.complete)return {error:`“${ref.name}” has ${totals.incomplete} ingredient(s) without valid Nutrition references or measured g/ml amounts. Complete the recipe in Meals first.`};
   if(!Number.isFinite(amount)||amount<=0)return {error:'Enter the number of servings you ate.'};
   return {entryType:'recipe',recipeId:ref.id,ingredient:ref.name,amount,unit:'serving',...Object.fromEntries(MACRO_KEYS.map(k=>[k,totals[k]*amount/servingCount(ref)]))};
  }
  const name=field('manualName').value.trim();
  if(!name)return {error:'Enter a description for this manual entry.'};
  const rawAmount=field('manualAmount').value;
  const amount=rawAmount===''?0:num('manualAmount');
  if(!Number.isFinite(amount))return {error:'Enter a valid amount.'};
  const macros={};
  for(const k of MACRO_KEYS){const val=num('manual-'+k);if(!Number.isFinite(val))return {error:`Enter a valid ${k} value.`};macros[k]=val;}
  return {entryType:'manual',ingredient:name,amount,unit:old.unit&&inferredType==='manual'?old.unit:'',...macros};
 };
 function preview(){const kind=type();DIALOG_CONTENT.querySelectorAll('[data-log-panel]').forEach(p=>{p.hidden=p.dataset.logPanel!==kind;});el('log-error').textContent='';const result=getSource();if(result.error){el('log-macro-preview').innerHTML=`<span class="tiny">${esc(result.error)}</span>`;return;}
 el('log-macro-preview').innerHTML=`<strong>Calculated entry macros</strong>${macroTiles(result)}<p class="tiny">These values will be saved as a snapshot in your Food Log.</p>`;
 }
 el('log-entry-kind').addEventListener('change',preview);
 // Filter the recipe dropdown in place: typing never closes the modal or discards chosen portions.
 const recipeSearch=el('log-recipe-search'),recipeSelect=el('log-recipe-id'),recipeMatchCount=el('recipe-match-count');
 function updateRecipeOptions(){
  const query=recipeSearch.value.trim().toLocaleLowerCase();
  const selected=recipeSelect.value;
  const matches=sortedRecipes.filter(r=>(r.name+' '+(r.category||'')+' '+(r.mealType||'')+' '+(r.ingredients||[]).map(i=>i.name||'').join(' ')).toLocaleLowerCase().includes(query));
  recipeSelect.innerHTML=`<option value="">${matches.length?'Choose a recipe…':'No matching recipes'}</option>`+matches.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
  recipeSelect.value=matches.some(r=>r.id===selected)?selected:'';
  recipeMatchCount.textContent=`${matches.length} matching recipe${matches.length===1?'':'s'}${!matches.length?' — try a different search':''}`;
  preview();
 }
 recipeSearch.addEventListener('input',updateRecipeOptions);
 DIALOG_CONTENT.querySelectorAll('input,select').forEach(node=>{if(node.id!=='log-entry-kind'&&node.id!=='log-recipe-search'){node.addEventListener('input',preview);node.addEventListener('change',preview);}});
 el('log-add-nutrition').onclick=()=>{DIALOG.close();location.hash='#nutrition';};
 el('log-edit-recipes').onclick=()=>{DIALOG.close();location.hash='#meals';};
 el('modal-cancel').onclick=()=>DIALOG.close();
 EDIT_FORM.onsubmit=e=>{
  e.preventDefault();const entry=getSource();if(entry.error)return showError(entry.error);
  const date=DIALOG_CONTENT.querySelector('[data-field="date"]')?.value||today();
  if(!safeDate(date))return showError('Choose a valid date.');
  entry.meal=DIALOG_CONTENT.querySelector('[data-field="meal"]').value.trim();
  let target=day;
  if(!target||target.date!==date){target=data.foodLogs.find(v=>v.date===date);if(!target){target={id:id(),date,sheet:'New entries',workout:'',originalTotals:null,entries:[]};data.foodLogs.push(target);}}
  if(!Array.isArray(target.entries))target.entries=[];
  const newEntry={id:item?.id||id(),...entry};
  if(item){const oldIndex=day.entries.findIndex(v=>v.id===item.id);if(day===target){if(oldIndex>=0)day.entries[oldIndex]=newEntry;else target.entries.push(newEntry);}else{if(oldIndex>=0)day.entries.splice(oldIndex,1);target.entries.push(newEntry);}}
  else target.entries.push(newEntry);
  save();DIALOG.close();render();toast(entry.entryType==='ingredient'?'Nutrition ingredient added to Food Log.':entry.entryType==='recipe'?'Whole recipe added to Food Log.':'Manual macros added to Food Log.');
 };
 DIALOG.showModal();preview();
 if(prefill?.kind==='ingredient')el('log-nutrient-amount').focus();else if(prefill?.kind==='recipe')el('log-recipe-amount').focus();else el('log-entry-kind').focus();
}
function favSignature(entry){const type=entry.entryType||'manual';return [type,entry.nutrientId||entry.recipeId||String(entry.ingredient||'').toLowerCase(),n(entry.amount),entry.unit||''].join('|');}
function recentFoods(){const seen=new Set(),recent=[];for(const day of data.foodLogs.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))){for(const entry of (day.entries||[]).slice().reverse()){const sig=favSignature(entry);if(!seen.has(sig)&&entry.ingredient){seen.add(sig);recent.push({entry,day});if(recent.length>=6)return recent;}}}return recent;}
function findFavorite(entry){return data.foodFavorites.find(x=>favSignature(x)===favSignature(entry));}
function logFromSaved(source){let result;
 if(source.entryType==='ingredient'){
  const ref=data.nutrients.find(x=>x.id===source.nutrientId)||nutrientFor(source.ingredient);if(!ref){toast('Ingredient no longer exists in Nutrition. Please add it there first.');return;}
  const amount=n(source.amount);if(!(amount>0)){toast('Saved ingredient amount is invalid.');return;}
  result={entryType:'ingredient',nutrientId:ref.id,ingredient:ref.name,amount,unit:source.unit||'g',...Object.fromEntries(MACRO_KEYS.map(k=>[k,n(ref[k])*amount/100]))};
 }else if(source.entryType==='recipe'){
  const ref=data.recipes.find(x=>x.id===source.recipeId)||data.recipes.find(x=>x.name===source.ingredient);if(!ref){toast('Recipe no longer exists in Meals.');return;}
  const macros=recipeMacros(ref);if(!macros.complete){toast('Complete the recipe’s ingredient quantities in Meals first.');return;}
  const amount=n(source.amount),multiplier=source.unit==='serving'?amount/servingCount(ref):amount;
  if(!(amount>0)){toast('Saved recipe portion is invalid.');return;}
  result={entryType:'recipe',recipeId:ref.id,ingredient:ref.name,amount,unit:source.unit==='serving'?'serving':'recipe',...Object.fromEntries(MACRO_KEYS.map(k=>[k,macros[k]*multiplier]))};
 }else{
  // Old imported and manually entered foods keep their historical macro snapshot.
  result={entryType:'manual',ingredient:source.ingredient,amount:n(source.amount),unit:source.unit||'',...Object.fromEntries(MACRO_KEYS.map(k=>[k,n(source[k])]))};
 }
 result.meal=source.meal||'';result.id=id();let day=data.foodLogs.find(x=>x.date===today());if(!day){day={id:id(),date:today(),sheet:'New entries',workout:'',originalTotals:null,entries:[]};data.foodLogs.push(day);}day.entries.push(result);save();render();toast('Logged '+result.ingredient+' to today.');
}
function favoriteToggle(entry){const old=findFavorite(entry);if(old){data.foodFavorites=data.foodFavorites.filter(x=>x.id!==old.id);toast('Removed from favourites.');}else{const snap={...entry};delete snap.id;data.foodFavorites.unshift({...snap,id:id()});toast('Added to favourite foods.');}save();render();}
function smallFoodRow(entry,action,key,extra=''){
 const type=entry.entryType==='recipe'?'Recipe':entry.entryType==='ingredient'?'Nutrition':entry.entryType==='manual'?'Manual':'Imported';
 const qty=entry.unit==='serving'?`${fmtNumber(entry.amount,2)} serving(s)`:entry.unit==='recipe'?`${fmtNumber(entry.amount,2)} whole recipe(s)`:entry.amount?`${fmtNumber(entry.amount,1)} ${esc(entry.unit||'')}`:'';
 return `<div class="saved-food-row"><div class="saved-food-name"><b>${esc(entry.ingredient||'Food')}</b><small>${esc(type)} · ${qty} · ${fmtNumber(entry.calories)} kcal</small></div><div class="row-actions">${btn('＋ Log',''+action,'small secondary',key)}${extra}</div></div>`;
}
function foodEntryActions(day,entry){
 const kind=entry.entryType==='recipe'?'Recipe':entry.entryType==='ingredient'?'Nutrition':entry.entryType==='manual'?'Manual':'Imported';
 const unit=entry.unit==='recipe'?' × whole recipe':entry.unit==='serving'?' servings':entry.unit?` ${entry.unit}`:'';
 const key=day.id+'::'+entry.id;
 return `<div class="log-entry"><span class="log-entry-name">${esc(entry.meal?entry.meal+' · ':'')}${esc(entry.ingredient||'Food')} <span class="tiny">(${fmtNumber(entry.amount,2)}${esc(unit)})</span> <span class="tag">${kind}</span></span><b>${fmtNumber(entry.calories)} kcal</b><div class="row-actions">${btn(findFavorite(entry)?'★':'☆','toggle-favorite','small light',key)}${btn('Again','log-again','small secondary',key)}${btn('Edit','edit-log','small light',key)}${btn('×','delete-log','small danger',key)}</div></div>`;
}
function monthStats(month){
 const perDate=new Map();
 for(const day of data.foodLogs){
  if(!safeDate(day.date)||!day.date.startsWith(month)||!Array.isArray(day.entries)||!day.entries.length)continue;
  if(!perDate.has(day.date))perDate.set(day.date,[]);
  perDate.get(day.date).push(...day.entries);
 }
 const daily=[...perDate].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,entries])=>({date,entries:entries.length,macros:sumMacros(entries)}));
 const totals=sumMacros(daily.map(d=>d.macros));
 return {daily,totals,days:daily.length,entries:daily.reduce((sum,d)=>sum+d.entries,0)};
}
function monthLabel(month){if(!/^\d{4}-\d{2}$/.test(month))return month;return new Date(month+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'});}
function logsView(){
 const date=today();
 const dayRecords=data.foodLogs.filter(d=>d.date===date);
 const todayEntries=dayRecords.flatMap(day=>(day.entries||[]).map(entry=>({day,entry})));
 const todayMacros=sumMacros(todayEntries.map(x=>x.entry));
 const past=data.foodLogs.filter(d=>safeDate(d.date)&&d.date!==date&&(filter.logMonth==='all'||d.date.startsWith(filter.logMonth))).sort((a,b)=>b.date.localeCompare(a.date));
 const months=[...new Set(data.foodLogs.filter(d=>safeDate(d.date)).map(d=>d.date.slice(0,7)).concat([date.slice(0,7)]))].sort().reverse();
 const selectedStatsMonth=months.includes(filter.statsMonth)?filter.statsMonth:date.slice(0,7);
 const stats=monthStats(selectedStatsMonth);
 const recent=recentFoods();
 const logDay=day=>{const m=sumMacros(day.entries||[]);return `<article class="log-day"><div class="log-summary"><div><b>${prettyDate(day.date)}</b><div class="tiny">${esc(day.sheet||'Food log')} · ${(day.entries||[]).length} entries${day.workout?' · Workout: '+esc(day.workout):''}</div></div><div class="log-metrics"><span><b>${fmtNumber(m.calories)}</b> kcal</span><span><b>${fmtNumber(m.protein,1)}</b> g protein</span>${btn('+ Food','add-log-day','small secondary',day.id)}</div></div><details><summary class="historical-summary">Show food entries (${(day.entries||[]).length})</summary><div class="log-list">${(day.entries||[]).map(e=>foodEntryActions(day,e)).join('')}</div></details></article>`;};
 const maxCalories=Math.max(1,...stats.daily.map(d=>d.macros.calories));
 return headline('YOUR FOOD DIARY','Food log','Today first, your favourite shortcuts, and your full food history.',btn('＋ Add food','new-log'))+`
 <section class="card today-log-card" aria-label="Today's food entries"><div class="flex-between"><div><p class="eyebrow">TODAY · ${prettyDate(date)}</p><h2>Today's logged food</h2><p class="tiny">${todayEntries.length} food entr${todayEntries.length===1?'y':'ies'} today · From Nutrition, recipes and manual entries</p></div>${btn('+ Log food','new-log','secondary')}</div>
 ${macroTiles(todayMacros)}
 ${todayEntries.length?`<div class="log-list today-log-list">${todayEntries.slice().reverse().map(({day,entry})=>foodEntryActions(day,entry)).join('')}</div>`:empty('◴','Nothing logged today','Your logged foods will appear here as soon as you add them.',btn('+ Add your first food','new-log','small secondary'))}
 </section>
 <div class="grid two food-shortcuts"><section class="card"><div class="flex-between"><h2>★ Favourite foods</h2><span class="tiny">One-tap logging</span></div>${data.foodFavorites.length?data.foodFavorites.slice(0,8).map(x=>smallFoodRow(x,'log-favorite',x.id,btn('★ Remove','remove-favorite','small light',x.id))).join(''):'<p class="tiny">Star foods in today’s entries or your history to save them here.</p>'}</section>
 <section class="card"><div class="flex-between"><h2>Recently logged</h2><span class="tiny">Repeat an amount</span></div>${recent.length?recent.map(x=>smallFoodRow(x.entry,'log-again',x.day.id+'::'+x.entry.id,btn(findFavorite(x.entry)?'★':'☆','toggle-favorite','small light',x.day.id+'::'+x.entry.id))).join(''):'<p class="tiny">Log food to see recently recorded items here.</p>'}</section></div>
 <section class="food-history-section"><div class="section-head"><h2>Past logs</h2><span class="tiny">Earlier days</span></div>
 <div class="toolbar"><select class="select" aria-label="Filter past food logs by month" data-filter="logMonth"><option value="all">All months</option>${months.map(m=>`<option value="${esc(m)}" ${filter.logMonth===m?'selected':''}>${esc(monthLabel(m))}</option>`).join('')}</select><span class="tiny">${past.length} past log day${past.length===1?'':'s'}</span></div>
 ${past.length?`${past.slice(0,40).map(logDay).join('')}${past.length>40?'<p class="tiny">Showing 40 latest past log records. Choose a month to find earlier entries.</p>':''}`:empty('◴','No past logs in this view','Try another month, or start a new food log today.')}
 </section>
 <section class="card monthly-stats"><div class="flex-between"><div><h2>Monthly food statistics</h2><p class="tiny">Recorded Food Log entries only · averages use days with at least one food entry.</p></div><label class="stats-month-label">Month<select class="select" aria-label="Statistics month" data-filter="statsMonth">${months.map(m=>`<option value="${esc(m)}" ${selectedStatsMonth===m?'selected':''}>${esc(monthLabel(m))}</option>`).join('')}</select></label></div>
 ${stats.days?`<div class="monthly-stats-grid"><div class="monthly-stat"><small>Days logged</small><b>${stats.days}</b><span>days with food entries</span></div><div class="monthly-stat"><small>Food entries</small><b>${fmtNumber(stats.entries)}</b><span>items logged</span></div><div class="monthly-stat"><small>Total calories</small><b>${fmtNumber(stats.totals.calories)}</b><span>kcal recorded</span></div><div class="monthly-stat"><small>Average calories</small><b>${fmtNumber(stats.totals.calories/stats.days)}</b><span>kcal per logged day</span></div><div class="monthly-stat"><small>Average protein</small><b>${fmtNumber(stats.totals.protein/stats.days,1)} g</b><span>per logged day</span></div><div class="monthly-stat"><small>Average carbs / fat</small><b>${fmtNumber(stats.totals.carbs/stats.days,1)} / ${fmtNumber(stats.totals.fat/stats.days,1)} g</b><span>per logged day</span></div></div>
 <details class="stats-details"><summary>Daily calorie breakdown (${stats.days} logged days)</summary><div class="monthly-bars">${stats.daily.map(d=>`<div class="month-bar-row"><span>${prettyDate(d.date)}</span><div class="month-bar-track"><div class="month-bar-fill" style="width:${Math.max(1,d.macros.calories/maxCalories*100)}%"></div></div><b>${fmtNumber(d.macros.calories)} kcal</b></div>`).join('')}</div></details>`
 :`<p class="muted">No food entries logged in ${esc(monthLabel(selectedStatsMonth))}. Choose another month to view statistics.</p>`}
 </section>`;
}
function archiveView(){const names=Object.keys(data.archive);if(!names.includes(filter.archiveSheet))filter.archiveSheet=names[0]||'';const rows=Array.isArray(data.archive[filter.archiveSheet])?data.archive[filter.archiveSheet]:[];const term=filter.archiveSearch.toLowerCase();const match=rows.filter(row=>!term||Object.values(row.cells||{}).join(' ').toLowerCase().includes(term)||String(row.row).includes(term));const maxPage=Math.max(0,Math.ceil(match.length/50)-1);filter.archivePage=Math.min(filter.archivePage,maxPage);const view=match.slice(filter.archivePage*50,(filter.archivePage+1)*50);const cols=[...new Set(view.flatMap(x=>Object.keys(x.cells||{})))].sort((a,b)=>colIndex(a)-colIndex(b));return headline('WORKBOOK RECORDS','Sheet archive','An editable snapshot of the original source sheets, separate from the main app sections.',btn('+ Add archive row','new-archive-row'))+`<p class="archive-note">These are original workbook cell values (not live Excel formulas or VBA). Editing the archive does not update the separate Meals, Budget, Events, or Nutrition sections.</p><div class="toolbar"><select class="select" data-filter="archiveSheet">${names.map(name=>`<option ${filter.archiveSheet===name?'selected':''} value="${esc(name)}">${esc(name)}</option>`).join('')}</select><input class="search" data-filter="archiveSearch" placeholder="Search sheet values…" value="${esc(filter.archiveSearch)}"></div>${view.length?`<div class="scroll-table"><table class="data-table"><thead><tr><th>Excel row</th>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${view.map(row=>`<tr><th>${row.row}</th>${cols.map(c=>`<td><button class="edit-cell" type="button" data-action="edit-archive" data-id="${esc(row.row+'::'+c)}" title="Edit cell ${esc(c+row.row)}">${esc(row.cells?.[c]??'')||'·'}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="pagination"><button type="button" data-action="prev-archive" ${filter.archivePage===0?'disabled':''}>← Previous</button><span class="tiny">${fmtNumber(filter.archivePage+1)} / ${fmtNumber(maxPage+1)} · ${match.length} rows</span><button type="button" data-action="next-archive" ${filter.archivePage>=maxPage?'disabled':''}>Next →</button></div>`:empty('▥','No sheet data yet','Import your personal-data JSON file to view the original workbook records.')}`;}
function colIndex(col){let i=0;for(const c of col)i=i*26+(c.charCodeAt(0)-64);return i;}
function moreView(){return headline('ALL SECTIONS','Explore Everything','Open any of your tools on your phone or laptop.')+`<div class="grid two">${[['todo','✓','To Do','Your tasks and reminders'],['budget','◈','Budget','Balances, income and monthly costs'],['events','▦','Events','Upcoming plans and past shows'],['meals','◉','Meals','Recipes and meal selection'],['shopping','▤','Shopping','Nutrition-based foods and reusable extras'],['notes','✎','Notes','Colour-coded text and checklists'],['nutrition','♡','Nutrition','Ingredient reference values'],['logs','◴','Food log','Historical meals and daily records'],['archive','▥','Sheet archive','Editable source worksheets'],['settings','⚙','Data & settings','Import, export and privacy']].map(x=>`<a class="card" href="#${x[0]}"><div style="font-size:25px;color:var(--teal);margin-bottom:10px">${x[1]}</div><h2>${x[2]}</h2><p class="tiny">${x[3]}</p></a>`).join('')}</div>`;}
function settingsView(){const archiveRows=Object.values(data.archive).reduce((sum,v)=>sum+(Array.isArray(v)?v.length:0),0);return headline('PRIVACY & BACKUP','Data & settings','Your daily targets, private device transfers and backups.')+`<div class="notice" style="margin-bottom:20px"><b>Phone-first workflow:</b> Keep your Samsung as the main copy. Before editing on your laptop, export a <b>Full backup on the phone</b> and restore it on the laptop. Make laptop edits, export a new Full backup, then restore that on the phone. <b>Restore replaces all local records; it does not merge them.</b> Export a safety backup on the phone immediately before restoring. Do not make new phone edits while the laptop has the active copy.</div>
 <section class="card" style="margin-bottom:20px"><div class="flex-between"><div><h2>Daily nutrition & water targets</h2><p class="tiny">Customize the progress bars on Home. Zero means no target set. The 2,000 ml starter water reference is editable, not a medical recommendation.</p></div>${btn('Edit daily targets','edit-targets','secondary')}</div><div class="target-summary">${[['calories','kcal'],['protein','g'],['carbs','g'],['fat','g'],['fiber','g'],['water','ml']].map(([k,unit])=>`<span class="tag">${esc(k)}: ${dailyTarget(k)?fmtNumber(dailyTarget(k))+' '+unit:'Not set'}</span>`).join('')}</div></section><section class="card" style="margin-bottom:20px"><h2>Restore a file on your phone or laptop</h2><p class="subtitle">Choose the actual <b>.json</b> backup file saved on this device (usually in <b>Downloads</b> or <b>My Files</b> on Samsung). Everything identifies whether it is a full backup, To Do-only file, or other-data file. A ZIP file or HTML preview is not a backup.</p><input id="json-import-direct" type="file" aria-label="Choose private Everything JSON backup" style="display:block;width:100%;max-width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--line,#c6d1dc);border-radius:12px;margin:12px 0"><p class="tiny">This restores locally and does not upload anything. You will see the number of tasks, recipes and Food Log days before confirming. <b>Imports replace the corresponding existing data rather than merging it.</b></p></section>${importFeedback?`<div class="notice" role="status" style="margin-bottom:18px">${esc(importFeedback)}</div>`:''}<div class="grid two"><section class="card"><h2>Import private files</h2><div class="setting-row"><div><strong>To Do list</strong><p>Import your private To Do JSON. The GitHub version has zero tasks.</p></div>${btn('Import To Do','import-todo','secondary')}</div><div class="setting-row"><div><strong>Other workbook data</strong><p>Budget, events, notes, recipes, shopping, nutrition, food log, water tracker and archive.</p></div>${btn('Import data','import-data','secondary')}</div><div class="setting-row"><div><strong>Restore complete backup</strong><p>Restore all sections including To Do.</p></div>${btn('Restore backup','import-all','light')}</div></section><section class="card"><h2>Export & protect data</h2><div class="setting-row"><div><strong>Private To Do</strong><p>Download To Do tasks without other sections.</p></div>${btn('Export To Do','export-todo','secondary')}</div><div class="setting-row"><div><strong>Other personal data</strong><p>Includes daily water records and shopping checks.</p></div>${btn('Export data','export-data','secondary')}</div><div class="setting-row"><div><strong>Full backup</strong><p>Download everything, including tasks.</p></div>${btn('Full backup','export-all','')}</div></section></div>
<div class="section-head"><h2>Garmin Connect</h2></div><section class="card"><div class="flex-between"><div><h2>Garmin integration is possible</h2><p class="subtitle">Garmin provides a Personal API for your own fitness data. Automatic synchronization is <b>not yet enabled</b> in this static version. A secure connection requires token authentication and suitable handling of your personal API key; do not put keys in GitHub or this app’s public JavaScript.</p></div><a class="btn secondary" href="https://developer.garmin.com/gc-developer-program/personal/personal-api/" target="_blank" rel="noopener noreferrer">Garmin Personal API ↗</a></div></section>
<div class="section-head"><h2>Data on this device</h2></div><div class="grid four"><div class="card stat"><div class="label">Tasks</div><div class="number">${data.todo.length}</div></div><div class="card stat"><div class="label">Recipes</div><div class="number">${data.recipes.length}</div></div><div class="card stat"><div class="label">Food log days</div><div class="number">${data.foodLogs.length}</div></div><div class="card stat"><div class="label">Archived rows</div><div class="number">${fmtNumber(archiveRows)}</div></div></div><div class="section-head"><h2>Privacy & limitations</h2></div><div class="card small-gap"><p class="subtitle">The app does not send your records to an external service. Anyone accessing your unlocked browser profile may read them. JSON exports are <b>not encrypted</b>. The original Excel macros and formulas are not executed, and archived cells are not synced to the main app.</p>${btn('Erase all local app data','reset-all','danger')}</div>`;}
function render(){let html='';switch(route){case'home':html=dashboard();break;case'todo':html=todoView();break;case'budget':html=budgetView();break;case'events':html=eventsView();break;case'meals':html=mealsView();break;case'shopping':html=shoppingView();break;case'notes':html=notesView();break;case'nutrition':html=nutritionView();break;case'logs':html=logsView();break;case'archive':html=archiveView();break;case'settings':html=settingsView();break;case'more':html=moreView();break;}APP.innerHTML=html;document.title=(route==='home'?'Overview':route[0].toUpperCase()+route.slice(1))+' · Everything';}
function downloadJSON(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'});downloadBlob(name,blob);}
function downloadBlob(name,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('File downloaded. Keep it private.');}
function otherData(){const obj={format:'everything-data',version:1,exportedAt:new Date().toISOString()};for(const key of ['budget','events','recipes','extras','shoppingFoods','selectedMeals','nutrients','foodLogs','notes','water','targets','foodFavorites','shoppingChecked','archive'])obj[key]=data[key];return obj;}
function exportBy(kind){if(kind==='todo')downloadJSON('Everything_ToDo_PRIVATE.json',{format:'everything-todo',version:1,exportedAt:new Date().toISOString(),todo:data.todo});else if(kind==='data')downloadJSON('Everything_Personal_Data_PRIVATE.json',otherData());else downloadJSON('Everything_FULL_BACKUP_PRIVATE.json',{format:'everything-all',version:1,exportedAt:new Date().toISOString(),...data});}
function importBy(kind){pendingImport=kind;IMPORT_INPUT.value='';try{IMPORT_INPUT.click();}catch(error){importFeedback='The file picker did not open. Please use the visible Choose File control above.';route='settings';render();}}
async function readJSONBackup(file){
 if(!file)throw new Error('No file was selected.');
 if(file.size>20*1024*1024)throw new Error('This JSON is larger than the 20 MB import limit.');
 if(/\.(zip|html?|xlsm?|xlsx?)$/i.test(file.name||''))throw new Error('This is not a JSON backup. Select the Everything_...PRIVATE.json file, not the ZIP, Excel workbook or HTML preview.');
 let contents='';
 if(typeof file.text==='function')try{contents=await file.text();}catch(error){contents='';}
 if(!contents){contents=await new Promise((resolve,reject)=>{try{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('The phone could not read that file. Save it to My Files / Downloads and choose it again.'));reader.readAsText(file,'UTF-8');}catch(e){reject(e);}});}
 if(!contents.trim())throw new Error('The selected file is empty. Select a completed .json backup.');
 let obj;try{obj=JSON.parse(contents.replace(/^\uFEFF/,''));}catch{throw new Error('This file does not contain valid JSON. Make sure you selected the downloaded Everything backup, not the preview page.');}
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('This is not a valid Everything backup.');
 return obj;
}
async function handleImportFile(file,requestedKind='auto'){
 if(!file)return;
 try{
  const obj=await readJSONBackup(file);
  const types={'everything-todo':'todo','everything-data':'data','everything-all':'all'};
  const kind=types[obj.format];
  if(!kind)throw new Error('Unrecognized file format. Please export the data from Everything using Full backup, Export data, or Export To Do.');
  if(requestedKind!=='auto'&&kind!==requestedKind){const names={todo:'To Do list',data:'Other personal data',all:'Full backup'};throw new Error(`This is a ${names[kind]} file. Choose the matching import button, or use the visible Choose File control to detect it automatically.`);}
  if(kind==='todo'&&!Array.isArray(obj.todo))throw new Error('The To Do file is missing its task list.');
  if(kind==='data'&&(!Array.isArray(obj.recipes)||!Array.isArray(obj.events)))throw new Error('The personal-data file is incomplete.');
  if(kind==='all'&&(!Array.isArray(obj.todo)||!Array.isArray(obj.recipes)||!Array.isArray(obj.foodLogs)||!Array.isArray(obj.nutrients)))throw new Error('The full backup is missing required sections. No data was changed.');
  let candidate;
  if(kind==='todo')candidate=normalize({...data,todo:obj.todo});
  else if(kind==='data'){
   const other=normalize(obj);
   candidate=normalize({...data});
   for(const k of ['budget','events','recipes','extras','shoppingFoods','selectedMeals','nutrients','foodLogs','notes','water','targets','foodFavorites','shoppingChecked','archive']){if((k==='notes'||k==='shoppingFoods')&&!Object.prototype.hasOwnProperty.call(obj,k))continue;candidate[k]=other[k];}
  }else candidate=normalize(obj);
  const counts=`${candidate.todo.length} tasks, ${candidate.recipes.length} recipes, ${candidate.nutrients.length} nutrition items, ${candidate.foodLogs.length} Food Log days`;
  const scope=kind==='todo'?'your To Do list only':kind==='data'?'every section except To Do':'ALL sections including To Do';
  const warning=`Ready to import ${file.name}\n\nThe file contains / will leave you with: ${counts}.\n\nThis will REPLACE ${scope} on this device. It will not merge changes.\n\nHave you exported a safety backup from this device?`;
  if(!confirm(warning)){importFeedback='Import cancelled. Your current data is unchanged.';render();return;}
  let serialized;
  try{serialized=JSON.stringify(candidate);localStorage.setItem(STORE_KEY,serialized);if(localStorage.getItem(STORE_KEY)!==serialized)throw new Error('Storage verification failed');}
  catch(e){throw new Error('The browser could not save the backup (storage full or blocked). Your original data was kept. Try using a regularly installed GitHub Pages version or free browser storage, then retry.');}
  data=candidate;lockOpenNote();checkedShop=new Set(data.shoppingChecked||[]);randomizedRecipes=[];
  importFeedback=`Restored ${file.name} successfully. On this device: ${counts}. Export another backup after making new changes.`;
  render();toast('Backup imported and saved successfully.');
 }catch(error){importFeedback='Import not completed: '+(error?.message||String(error));render();toast('Import failed. See Data & settings for details.');}
}
IMPORT_INPUT.addEventListener('change',()=>{const file=IMPORT_INPUT.files?.[0];if(file)handleImportFile(file,pendingImport||'auto');});
document.addEventListener('change',event=>{if(event.target?.id==='json-import-direct'){const file=event.target.files?.[0];if(file)handleImportFile(file,'auto');}});
function exportShopping(){const list=shopList();const items=[...list.needed.map(v=>{const ref=nutrientFor(v.name),alt=data.extras.find(x=>x.name.toLowerCase()===v.name.toLowerCase());return {category:ref?.category||alt?.category||'Uncategorized ingredients',name:v.name,quantity:`${fmtNumber(v.amount,2)} ${v.unit==='legacy'?'(unit not set)':v.unit}`,key:'ing:'+v.key};}),...list.foods.map(v=>{const ref=data.nutrients.find(x=>x.id===v.nutritionId)||nutrientFor(v.name);return {category:ref?.category||'Uncategorized ingredients',name:ref?.name||v.name,quantity:`${fmtNumber(v.amount,2)} ${v.unit||'pcs'}`,key:'food:'+v.id};}),...list.extras.map(x=>({category:x.category||'Other',name:x.name,quantity:'',key:'extra:'+x.id}))].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));const txt=[`Everything shopping list — ${today()}`,'','[x] = already bought',...items.map(x=>`${checkedShop.has(x.key)?'[x]':'[ ]'} ${x.category}: ${x.quantity} ${x.name}`)].join('\n');downloadBlob('Everything_Shopping_List.txt',new Blob([txt],{type:'text/plain;charset=utf-8'}));}
function onAction(act,key){let obj,idx,day,item;const quick=document.getElementById('quick-add-menu');if(act!=='toggle-quick-add'&&quick){quick.hidden=true;document.getElementById('quick-add-button')?.setAttribute('aria-expanded','false');}if(act.startsWith('nav-')){location.hash='#'+act.slice(4);return;}switch(act){
case 'toggle-quick-add':{if(quick){quick.hidden=!quick.hidden;document.getElementById('quick-add-button')?.setAttribute('aria-expanded',String(!quick.hidden));if(!quick.hidden)quick.querySelector('button')?.focus();}break;}
case 'edit-targets':goalsForm();break;
case 'log-favorite':obj=data.foodFavorites.find(x=>x.id===key);if(obj)logFromSaved(obj);break;
case 'remove-favorite':data.foodFavorites=data.foodFavorites.filter(x=>x.id!==key);save();render();toast('Removed from favourites.');break;
case 'toggle-favorite':[day,item]=getLogEntry(key);if(item)favoriteToggle(item);break;
case 'log-again':[day,item]=getLogEntry(key);if(item)logFromSaved(item);break;
case 'water-250':case 'water-500':case 'water-minus':{const amount=act==='water-500'?500:act==='water-250'?250:-250;data.water[today()]=Math.max(0,waterToday()+amount);save();render();break;}
case 'sort-todo-default':filter.taskSort='due';render();break;case 'sort-todo-colour':filter.taskSort='colour';render();break;
case 'new-task':taskForm();break;case 'edit-task':taskForm(data.todo.find(x=>x.id===key));break;case 'delete-task':confirmDelete('Delete this task?',()=>data.todo=data.todo.filter(x=>x.id!==key));break;case 'toggle-task':obj=data.todo.find(x=>x.id===key);if(obj){if(obj.completed)obj.completed=false;else if(obj.frequency==='one-time'||obj.frequency==='0'||!obj.frequency)obj.completed=true;else{obj.lastCompleted=today();obj.due=addDays(today(),obj.frequency);}save();render();}break;
case 'new-bill':billForm();break;case 'edit-bill':billForm(data.budget.bills.find(x=>x.id===key));break;case 'delete-bill':confirmDelete('Delete this upcoming bill?',()=>data.budget.bills=data.budget.bills.filter(x=>x.id!==key));break;case 'toggle-bill':obj=data.budget.bills.find(x=>x.id===key);if(obj){obj.paid=!obj.paid;save();render();toast(obj.paid?'Bill marked paid. Remember to update your balance.':'Bill marked unpaid.');}break;
case 'new-budget':budgetForm();break;case 'edit-budget':budgetForm(data.budget.monthly.find(x=>x.id===key));break;case 'delete-budget':confirmDelete('Delete this budget item?',()=>data.budget.monthly=data.budget.monthly.filter(x=>x.id!==key));break;case 'edit-balance':modal('Update current balance',[inputField('balance','Balance',data.budget.balance,'number',{step:'any'}),inputField('balanceDate','As of',data.budget.balanceDate||today(),'date'),inputField('currency','Currency',data.budget.currency||'CHF')],o=>Object.assign(data.budget,o));break;
case 'new-event':eventForm();break;case 'edit-event':eventForm(data.events.find(x=>x.id===key));break;case 'delete-event':confirmDelete('Delete this event?',()=>data.events=data.events.filter(x=>x.id!==key));break;
case 'new-recipe':recipeForm();break;case 'edit-recipe':recipeForm(data.recipes.find(x=>x.id===key));break;case 'delete-recipe':obj=data.recipes.find(x=>x.id===key);confirmDelete('Delete this recipe?',()=>{data.recipes=data.recipes.filter(x=>x.id!==key);data.selectedMeals=data.selectedMeals.filter(x=>x!==obj?.name);randomizedRecipes=randomizedRecipes.filter(x=>x!==key);});break;case 'toggle-recipe':obj=data.recipes.find(x=>x.id===key);if(obj){data.selectedMeals=data.selectedMeals.includes(obj.name)?data.selectedMeals.filter(v=>v!==obj.name):[...data.selectedMeals,obj.name];save();render();}break;
case 'random-recipes':{const source=data.recipes.filter(x=>recipeMacros(x).complete);const pool=(source.length>=3?source:data.recipes).slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}randomizedRecipes=pool.slice(0,3).map(x=>x.id);render();toast(randomizedRecipes.length?`${randomizedRecipes.length} random recipe(s) picked.`:'Add recipes first.');break;}
case 'add-random-recipes':for(const rid of randomizedRecipes){const r=data.recipes.find(x=>x.id===rid);if(r&&!data.selectedMeals.includes(r.name))data.selectedMeals.push(r.name);}save();render();toast('Selected recipes added to shopping list.');break;
case 'sort-notes-default':filter.noteSort='recent';render();break;case 'sort-notes-colour':filter.noteSort='colour';render();break;
case 'open-home-note':navigate('notes');onAction('open-note',key);break;
case 'new-note':noteForm();break;case 'open-note':obj=data.notes.find(x=>x.id===key);if(obj){if(obj.secure)openSecureNote(obj);else{activeNoteId=obj.id;unlockedNote=null;render();}}break;case 'back-notes':case 'lock-note':lockOpenNote();render();break;case 'edit-note':obj=data.notes.find(x=>x.id===key);if(obj)noteForm(obj);break;case 'delete-note':confirmDelete('Delete this note?',()=>{data.notes=data.notes.filter(x=>x.id!==key);lockOpenNote();});break;
case 'remove-shopping-food':confirmDelete('Remove this food item from your shopping list?',()=>{data.shoppingFoods=data.shoppingFoods.filter(x=>x.id!==key);checkedShop.delete('food:'+key);data.shoppingChecked=[...checkedShop];});break;
case 'new-extra':extraForm();break;case 'edit-extra':extraForm(data.extras.find(x=>x.id===key));break;case 'delete-extra':confirmDelete('Delete shopping item?',()=>data.extras=data.extras.filter(x=>x.id!==key));break;case 'quick-extra':{const input=[...APP.querySelectorAll('[data-category-input]')].find(el=>el.dataset.categoryInput===key);const name=input?.value.trim();if(!name){toast('Enter a shopping item name.');break;}if(data.extras.some(x=>x.category===key&&x.name.toLowerCase()===name.toLowerCase())){toast('This item already exists in that category.');break;}data.extras.push({id:id(),name,category:key,selected:true});save();render();toast('Shopping item added.');break;}
case 'toggle-extra':obj=data.extras.find(x=>x.id===key);if(obj){obj.selected=!obj.selected;save();render();}break;case 'clear-shop-checks':checkedShop.clear();saveShoppingChecks();render();break;case 'export-shopping':exportShopping();break;
case 'new-nutrient':nutrientForm();break;case 'edit-nutrient':nutrientForm(data.nutrients.find(x=>x.id===key));break;
case 'log-nutrient':logEntryForm(null,null,{kind:'ingredient',id:key});break;case 'log-recipe':logEntryForm(null,null,{kind:'recipe',id:key});break;case 'new-log':logEntryForm();break;case 'add-log-day':logEntryForm(data.foodLogs.find(x=>x.id===key));break;case 'edit-log':[day,item]=getLogEntry(key);if(day&&item)logEntryForm(day,item);break;case 'delete-log':[day,item]=getLogEntry(key);if(day&&item)confirmDelete('Remove this food entry?',()=>{day.entries=day.entries.filter(x=>x.id!==item.id);});break;
case 'prev-archive':filter.archivePage=Math.max(0,filter.archivePage-1);render();break;case 'next-archive':filter.archivePage++;render();break;case 'new-archive-row':if(!filter.archiveSheet){toast('Import data before adding archive rows.');break;}obj=data.archive[filter.archiveSheet]||[];idx=Math.max(0,...obj.map(x=>Number(x.row)||0))+1;obj.push({row:idx,cells:{A:''}});data.archive[filter.archiveSheet]=obj;save();filter.archivePage=Math.max(0,Math.ceil(obj.length/50)-1);filter.archiveSearch='';render();toast('Row added. Click a cell to edit.');break;case 'edit-archive':{const [rowStr,col]=key.split('::');const arr=data.archive[filter.archiveSheet]||[];const record=arr.find(x=>String(x.row)===rowStr);if(!record)return;modal(`Edit ${filter.archiveSheet} · ${col}${rowStr}`,[inputField('value','Cell value',record.cells[col]??'','textarea',{wide:true})],o=>{record.cells[col]=o.value;});break;}
case 'import-todo':importBy('todo');break;case 'import-data':importBy('data');break;case 'import-all':importBy('all');break;case 'export-todo':exportBy('todo');break;case 'export-data':exportBy('data');break;case 'export-all':exportBy('all');break;case 'reset-all':if(confirm('This will permanently erase local app data on THIS device. Export a backup first. Continue?')){data=BLANK();lockOpenNote();checkedShop.clear();randomizedRecipes=[];save();render();toast('Local data erased.');}break;
default:break;}}
function getLogEntry(key){const [d,e]=key.split('::');const day=data.foodLogs.find(x=>x.id===d);return [day,day?.entries.find(x=>x.id===e)];}
document.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;e.preventDefault();onAction(button.dataset.action,button.dataset.id||'');});
document.addEventListener('input',e=>{const fld=e.target.closest('[data-filter]');if(!fld||fld.type==='number'||fld.tagName==='SELECT')return;filter[fld.dataset.filter]=fld.value;const selectionStart=(typeof fld.selectionStart==='number')?fld.selectionStart:null;render();const replacement=APP.querySelector(`[data-filter="${fld.dataset.filter}"]`);replacement?.focus();if(selectionStart!==null&&replacement?.setSelectionRange)replacement.setSelectionRange(selectionStart,selectionStart);});
document.addEventListener('submit',e=>{if(e.target?.id!=='shop-food-form')return;e.preventDefault();const name=document.getElementById('shopping-food-name')?.value?.trim();const ref=nutrientFor(name);if(!ref){toast('This food is not in Nutrition. Add its nutrition values there first.');return;}const amount=Number(document.getElementById('shopping-food-amount')?.value);const unit=document.getElementById('shopping-food-unit')?.value;if(!Number.isFinite(amount)||amount<=0||!['pcs','g','ml'].includes(unit)){toast('Enter a valid positive quantity.');return;}data.shoppingFoods.push({id:id(),nutritionId:ref.id||'',name:ref.name,amount,unit});save();render();toast('Food added from Nutrition.');});
document.addEventListener('change',async e=>{const filterField=e.target.closest('[data-filter]');if(filterField&&(filterField.type==='number'||filterField.tagName==='SELECT')){filter[filterField.dataset.filter]=filterField.value;render();return;}const noteCheck=e.target.closest('[data-note-check]');if(noteCheck){const [noteId,itemId]=noteCheck.dataset.noteCheck.split('::');const note=data.notes.find(x=>x.id===noteId);const plain=note?.secure?(unlockedNote?.id===noteId?unlockedNote:null):note;const item=plain?.items?.find(x=>x.id===itemId);if(item){const wasChecked=item.checked,oldUpdatedAt=note.updatedAt;item.checked=noteCheck.checked;note.updatedAt=new Date().toISOString();if(note.secure){noteCheck.disabled=true;try{const oldSec=note.secure;note.secure=await encryptNoteContent({content:unlockedNote.content,items:unlockedNote.items},unlockedNote.key,oldSec);if(!save()){note.secure=oldSec;note.updatedAt=oldUpdatedAt;item.checked=wasChecked;throw new Error('Storage is full');}}catch(error){note.updatedAt=oldUpdatedAt;item.checked=wasChecked;toast('Checklist change could not be saved.');}}else{if(!save()){note.updatedAt=oldUpdatedAt;item.checked=wasChecked;}}render();}return;}const extra=e.target.closest('[data-extra-toggle]');if(extra){onAction('toggle-extra',extra.dataset.extraToggle);return;}const check=e.target.closest('[data-shop-check]');if(check){if(check.checked)checkedShop.add(check.dataset.shopCheck);else checkedShop.delete(check.dataset.shopCheck);saveShoppingChecks();render();}});
document.addEventListener('click',e=>{if(!e.target.closest('#quick-add-wrap')){const menu=document.getElementById('quick-add-menu');if(menu)menu.hidden=true;document.getElementById('quick-add-button')?.setAttribute('aria-expanded','false');}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.getElementById('quick-add-menu');if(menu)menu.hidden=true;}if(e.key==='Enter'&&e.target.matches('[data-category-input]')){e.preventDefault();onAction('quick-extra',e.target.dataset.categoryInput);}});
DIALOG.addEventListener('close',()=>{if(!DIALOG.open){DIALOG_CONTENT.replaceChildren();EDIT_FORM.onsubmit=null;}});
document.addEventListener('visibilitychange',()=>{const sensitiveEditor=DIALOG.open&&(DIALOG_CONTENT.querySelector('#note-protection')?.checked||DIALOG_CONTENT.querySelector('#note-unlock-password'));if(document.hidden&&(unlockedNote||sensitiveEditor)){if(DIALOG.open){DIALOG.close();DIALOG_CONTENT.replaceChildren();}lockOpenNote();render();}});
window.addEventListener('pagehide',lockOpenNote);
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));document.getElementById('backup-shortcut').onclick=()=>exportBy('all');
if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
navigate(location.hash.slice(1)||'home');
})();
