// must use a global variable since webkit-browsers only allow reading of dataTransfer in onDrop...
var elementDragged;

let kelpaaKohteeksi = ev => ev.target.ondrop && (ev.target.parentElement.id||'') != elementDragged[0];

let dragstart = ev => {
    if (!ev.target.id) {
        ev.target.id = Math.random().toString(36);
    }
    elementDragged = [ev.target.id, ev.clientX, ev.clientY];
    ev.dataTransfer.setDragImage(new Image(), 0, 0);

    let elem = ev.target;
    if (elem.style.width == 'auto' || elem.style.height == 'auto' || elem.style.bottom != 'auto' || elem.style.right != 'auto') {
        log('Ikkuna oli venytetty -> kiinnitetään koko');
        let offsetTop = elem.offsetTop;
        let offsetLeft = elem.offsetLeft;
        elem.style.width = elem.clientWidth + 'px';
        elem.style.height = elem.clientHeight + 'px';
        elem.style.right = 'auto';
        elem.style.bottom = 'auto';
        elem.style.top  = offsetTop + 'px';
        elem.style.left = offsetLeft + 'px';
    }
};

let drag = elem => ev => {
    let clientX = elementDragged[1];
    let clientY = elementDragged[2];
    elem.style.top  = (elem.offsetTop  - (clientY - (ev.clientY == 0 ? clientY : ev.clientY))) + 'px';
    elem.style.left = (elem.offsetLeft - (clientX - (ev.clientX == 0 ? clientX : ev.clientX))) + 'px';
    elementDragged[1] = ev.clientX;
    elementDragged[2] = ev.clientY;
    ev.stopPropagation();
};

let drop = (elem, onDrop) => ev => {
    if (kelpaaKohteeksi(ev)) {
        ev.target.classList.remove('over');
        ev.preventDefault();
        onDrop(document.getElementById(elementDragged[0]), elem, ev);
    }
};

let dragElement = (elem, onDrop) => {
    elem.setAttribute("draggable", "true");
    elem.addEventListener('dragstart', dragstart);
    elem.addEventListener('drag', drag(elem));

    if (onDrop) {
        let header = elem.getElementsByClassName('header')[0];
        header.addEventListener('dragenter', ev => kelpaaKohteeksi(ev) ? ev.target.classList.add('over') : '');
        header.addEventListener('dragover',  ev => ev.preventDefault());
        header.addEventListener('dragleave', ev => kelpaaKohteeksi(ev) ? ev.target.classList.remove('over') : '');
        header.ondrop = drop(elem, onDrop);
    }
};