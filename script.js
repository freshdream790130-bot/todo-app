function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  const emptyMsg = document.getElementById('emptyMsg');
  emptyMsg.style.display = 'none';

  const li = document.createElement('li');

  const span = document.createElement('span');
  span.className = 'todo-text';
  span.textContent = text;
  span.onclick = () => li.classList.toggle('done');

  const del = document.createElement('button');
  del.textContent = '삭제';
  del.className = 'button-delete';
  del.onclick = (e) => {
    e.stopPropagation();
    li.remove();
    if (document.getElementById('todoList').children.length === 0) {
      emptyMsg.style.display = 'block';
    }
  };

  li.appendChild(span);
  li.appendChild(del);
  document.getElementById('todoList').appendChild(li);
  input.value = '';
}

document.getElementById('todoInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTodo();
});
