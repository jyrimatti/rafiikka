// must use a global variable since webkit-browsers only allow reading of dataTransfer in onDrop...
var elementDragged;

let dragstart = tunniste => ev => {
    if (ev.dataTransfer.getData("rafiikka/tunniste")) {
        return false;
    }
    let elem = ev.target.closest('.dragContext');
    if (!elem.id) {
        elem.id = generateId();
    }
    elem.classList.add('dragging');
    log('Raahataan', elem.id);
    elementDragged = [elem.id, ev.clientX, ev.clientY];
    ev.dataTransfer.setDragImage(new Image(), 0, 0);

    if (elem.style.width == 'auto' || elem.style.height == 'auto' || elem.style.bottom != 'auto' || elem.style.right != 'auto') {
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

let dragend = ev => {
    let elem = document.getElementById(elementDragged[0]);
    if (elem) {
        elem.classList.remove('dragging');
    }
}

let drag = elem => ev => {
    if (!elem.parentElement) {
        // ikkuna poistettu
        return false;
    }
    let clientX = elementDragged[1];
    let clientY = elementDragged[2];

    let dy = (ev.clientY == 0 ? clientY : ev.clientY) - clientY;
    let dx = (ev.clientX == 0 ? clientX : ev.clientX) - clientX;

    let top = elem.offsetTop + dy;
    let left = elem.offsetLeft + dx;

    let headerHeight = (elem.querySelector(':scope > .header') || {}).offsetHeight || 0;

    if (left <= 1) {
        log("Snap", elem.id, "left");
        left = 0;
        elem.classList.add('snapped');
        elem.classList.add('left');
    }
    if (top <= headerHeight+1) {
        log("Snap", elem.id, "top");
        top = headerHeight;
        elem.classList.add('snapped');
        elem.classList.add('top');
    }
    if (left >= elem.parentElement.offsetWidth - elem.offsetWidth - 1) {
        log("Snap", elem.id, "right");
        left = elem.parentElement.offsetWidth - elem.offsetWidth;
        elem.classList.add('snapped');
        elem.classList.add('right');
    }
    if (top >= elem.parentElement.offsetHeight - elem.offsetHeight - 1) {
        log("Snap", elem.id, "bottom");
        top = elem.parentElement.offsetHeight - elem.offsetHeight;
        elem.classList.add('snapped');
        elem.classList.add('bottom');
    }

    if (dx < 0) {
        elem.classList.remove('right');
        elem.classList.remove('snapped');
    }
    if (dx > 0) {
        elem.classList.remove('left');
        elem.classList.remove('snapped');
    }
    if (dy < 0) {
        elem.classList.remove('bottom');
        elem.classList.remove('snapped');
    }
    if (dy > 0) {
        elem.classList.remove('top');
        elem.classList.remove('snapped');
    }

    elem.style.left = left + 'px';
    elem.style.top  = top + 'px';

    elementDragged[1] = ev.clientX;
    elementDragged[2] = ev.clientY;
    ev.stopPropagation();
};

let dragElement = (elem, tunniste) => {
    elem.classList.add('dragContext');
    [elem, ...elem.querySelectorAll('.draghandle')].filter(el => el.matches('.draghandle'))
                                                   .forEach(draghandle => {
        draghandle.setAttribute("draggable", "true");
        elem.addEventListener('dragstart', dragstart(tunniste));
        elem.addEventListener('dragend', dragend);
        elem.addEventListener('drag', drag(elem));
    });
};

let moveElement = (elem, tunnisteFunc) => {
    if (!elem.id) {
        elem.id = generateId();
    }
    let e = elem.getElementsByClassName('title')[0];
    e.classList.add('move');
    e.setAttribute("draggable", "true");
    e.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData("rafiikka/tunniste", tunnisteFunc());
        ev.dataTransfer.setData("rafiikka/elementid", elem.id);
    });
    e.addEventListener('drag', ev => {
        ev.stopPropagation();
    });
    e.addEventListener('dragend', ev => {
        ev.stopPropagation();
    });
}