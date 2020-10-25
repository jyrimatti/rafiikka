var elementDragged;

let dragstart = ev => {
    if (!ev.target.id) {
        ev.target.id = Math.random().toString(36);
    }
    elementDragged = [ev.target.id, ev.clientX, ev.clientY];
};

let dragend = ev => {
    let clientX = elementDragged[1];
    let clientY = elementDragged[2];
    let elem = document.getElementById(elementDragged[0]);
    if (elem) {
        elem.style.top  = (elem.offsetTop  - (clientY - ev.clientY)) + 'px';
        elem.style.left = (elem.offsetLeft - (clientX - ev.clientX)) + 'px';
    }
};

let dragElement = (elem, onDrop) => {
    elem.setAttribute("draggable", "true");
    elem.ondragstart = dragstart;
    elem.ondragend = dragend;
    if (onDrop) {
        let header = elem.getElementsByClassName('header')[0];
        header.ondragenter = ev => ev.target.ondrop ? ev.target.classList.add('over') : '';
        header.ondragover  = ev => ev.target.ondrop ? ev.preventDefault() : '';
        header.ondragleave = ev => ev.target.ondrop ? ev.target.classList.remove('over') : '';
        header.ondrop = ev => {
            ev.target.classList.remove('over');
            ev.preventDefault();
            onDrop(document.getElementById(elementDragged[0]), elem);
        };
    }
};