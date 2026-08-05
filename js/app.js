// ====== CONFIGURATION ======
// Replace with your real IT helpdesk inbox
const ADMIN_EMAIL = "sudiksha@socialdrishti.com";
const TICKET_PREFIX = "ITK";
const COUNTER_KEY = "it_ticket_counter";
// ============================

const form = document.getElementById('ticketForm');
const submitBtn = document.getElementById('submitBtn');

// In-memory fallback so the form NEVER gets stuck, even if persistent
// storage is unavailable in this preview context.
let memoryCounter = 0;

async function getNextTicketNumber(){
  // If window.storage isn't injected at all in this environment, skip
  // straight to the in-memory fallback instead of throwing.
  if (typeof window.storage === 'undefined' || !window.storage){
    memoryCounter += 1;
    return memoryCounter;
  }
  let next = 1;
  try{
    const res = await window.storage.get(COUNTER_KEY, true);
    if(res && res.value){
      next = parseInt(res.value, 10) + 1;
    }
  }catch(e){
    next = 1; // key doesn't exist yet — that's expected on first run
  }
  try{
    await window.storage.set(COUNTER_KEY, String(next), true);
  }catch(e){
    console.error('Could not persist ticket counter, continuing anyway', e);
  }
  return next;
}

function pad(n){ return String(n).padStart(5,'0'); }

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating ticket...';

  try{
    const data = {
      name: document.getElementById('empName').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      dept: document.getElementById('dept').value,
      category: document.getElementById('category').value,
      priority: document.querySelector('input[name=priority]:checked').value,
      subject: document.getElementById('subject').value.trim(),
      description: document.getElementById('description').value.trim(),
      phone: document.getElementById('phone').value.trim(),
    };

    const num = await getNextTicketNumber();
    const ticketId = `${TICKET_PREFIX}-${pad(num)}`;
    const now = new Date();
    const dateStr = now.toLocaleString('en-US', { dateStyle:'medium', timeStyle:'short' });

    // Persist the ticket record (shared, so an admin viewer could read it later).
    // Non-fatal if this fails — the ticket still gets created for the user.
    if (typeof window.storage !== 'undefined' && window.storage){
      try{
        await window.storage.set(`tickets:${ticketId}`, JSON.stringify({...data, ticketId, date: now.toISOString(), status:'OPEN'}), true);
      }catch(err){
        console.error('Could not save ticket record', err);
      }
    }

    // Populate stub view
    document.getElementById('stubNumber').textContent = ticketId;
    document.getElementById('rName').textContent = data.name;
    document.getElementById('rCategory').textContent = data.category;
    document.getElementById('rPriority').textContent = data.priority;
    document.getElementById('rSubject').textContent = data.subject;
    document.getElementById('rDate').textContent = dateStr;

    const emailBody =
`New IT support ticket submitted.

Ticket: ${ticketId}
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || '-'}
Department: ${data.dept}
Category: ${data.category}
Priority: ${data.priority}
Subject: ${data.subject}

Description:
${data.description}

Submitted: ${dateStr}`;

    const mailto = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(`[${ticketId}] ${data.subject} (${data.priority})`)}&body=${encodeURIComponent(emailBody)}`;
    document.getElementById('mailtoBtn').href = mailto;

    document.getElementById('copyBtn').onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(emailBody);
        const note = document.getElementById('copyNote');
        note.textContent = 'Copied to clipboard';
        setTimeout(()=> note.textContent='', 2000);
      }catch(err){
        alert('Could not copy automatically — please select and copy manually.');
      }
    };

    document.getElementById('formView').style.display = 'none';
    document.getElementById('stubView').style.display = 'block';
    window.scrollTo({top:0, behavior:'smooth'});

  }catch(err){
    console.error('Ticket submission failed', err);
    alert('Something went wrong creating the ticket: ' + (err && err.message ? err.message : err));
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit ticket';
  }
});

document.getElementById('newTicketBtn').addEventListener('click', ()=>{
  form.reset();
  document.getElementById('stubView').style.display = 'none';
  document.getElementById('formView').style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
});
