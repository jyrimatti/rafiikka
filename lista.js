let createListview = (elem, onHover, onSelect) => {
    elem.classList.add('detached');

    let elemHeader = document.createElement("div");
    elemHeader.setAttribute("class", "header draghandle");

    let headerText = document.createElement('span');
    headerText.classList.add('title')
    headerText.innerText = 'ruudulla';
    elemHeader.appendChild(headerText);

    elem.hiddenState = {_default: false};

    elemHeader.append(luoCollapseExpandAll(elem.hiddenState, () => updateListviewContents(elem, map)));
    
    let headerFilter = document.createElement('input');
    headerFilter.classList.add("filter");
    headerFilter.setAttribute("placeholder", "suodata...");
    headerFilter.addEventListener('input', () => updateListviewContents(elem, map));
    elemHeader.appendChild(headerFilter);

    elem.appendChild(elemHeader);

    dragElement(elem);

    elem.onHover = onHover;
    elem.onSelect = onSelect;
};

let luoCollapseExpandAll = (hiddenState, onclick) => {
    let collapseExpand = document.createElement('span');
    collapseExpand.classList.add('collapseExpand');
    let collapse = document.createElement('span');
    collapse.classList.add('collapse')
    collapse.innerText = '˄';
    collapse.setAttribute('title', 'sulje kaikki');
    collapseExpand.appendChild(collapse);
    let expand = document.createElement('span');
    expand.classList.add('expand')
    expand.innerText = '˅';
    expand.setAttribute('title', 'avaa kaikki');
    collapseExpand.appendChild(expand);
    
    let doOnclick = hidden => () => {
        Object.keys(hiddenState).forEach(x => hiddenState[x] = hidden);
        onclick();
    };
    expand.addEventListener('click',   doOnclick(false));
    collapse.addEventListener('click', doOnclick(true));

    return collapseExpand;
};

let luoCollapsoitavaLista = (details, titleHTML, hiddenState) => {
    let header = document.createElement("summary");
    header.innerHTML = titleHTML;
    details.appendChild(header);

    let ul = document.createElement("ul");
    if (hiddenState[titleHTML] || hiddenState._default) {
        details.removeAttribute('open');
    }
    header.addEventListener('click', () => hiddenState[titleHTML] = !(hiddenState[titleHTML] || hiddenState._default));

    details.appendChild(ul);
    return ul;
};

let updateListviewContents = (listview, map) => logDiff("updateListviewContents", () => {
    let layerFeatures = featuresOnScreen(map);

    listview.querySelectorAll('.listviewcontents').forEach(x => listview.removeChild(x));
    let container = document.createElement("div");
    container.setAttribute("class", "listviewcontents");

    layerFeatures.forEach(x => {
        let title = x[0].getProperties().title;
        if (title && title.indexOf('Tausta') < 0) {
            let details = document.createElement("details");
            details.setAttribute("open", "open");
            container.appendChild(details);
            let ul = luoCollapsoitavaLista(details, title, listview.hiddenState);

            let filterText = listview.querySelector('.filter').value || '';
            if (filterText) {
                filterText = filterText.trim().toLowerCase();
            }
            x[1].sort((a,b) => {
                let tunnisteA = lueTunniste(a.getProperties());
                return tunnisteA ? tunnisteA.localeCompare(lueTunniste(b.getProperties())) : undefined;
            })
                .forEach(f => {
                let props = f.getProperties();

                let text = 
                    onkoInfraOID(props.tunniste) ? parsiInfraNimi(parsiInfraRyhma(props), props) :
                    onkoTREXOID(props.tunniste)  ? parsiInfraNimi(parsiInfraRyhma(props), props) :
                    onkoJetiOID(props.tunniste)  ? parsiJetiNimi(props) :
                    onkoRumaOID(props.id)        ? props.id :
                    props.trainNumber            ? props.departureDate + ' (' + props.trainNumber + ')':
                                                   '?'
                if (filterText == '' || text.toLowerCase().indexOf(filterText) >= 0) {
                    let li = document.createElement("li");
                    
                    let focus = document.createElement("span");
                    focus.setAttribute("class", "objectfocus");
                    focus.innerText = '⌖';
                    focus.addEventListener('click', () => fitToView(map)(f));
                    li.appendChild(focus);

                    let licontent = document.createDocumentFragment();
                    let span = document.createElement('span');
                    span.innerHTML = text;
                    span.addEventListener('click',     ev => listview.onSelect(f, ev));
                    span.addEventListener('mouseenter', ev => listview.onHover(f, ev));
                    span.addEventListener('mouseleave',  ev => listview.onHover(f, ev));
                    licontent.appendChild(span);
                    li.appendChild(licontent);

                    ul.appendChild(li);
                }
            });
        }
    });

    listview.appendChild(container);
});