let luoMuutoksetPopup = (luotuja, duration, title, muutokset) => {
    try {
        return luoMuutoksetPopup_(luotuja, duration, title, muutokset);
    } catch (e) {
        log(e);
        return e;
    }
};
let luoMuutoksetPopup_ = (luotuja, duration, title, muutokset) => {
    let [container, elemHeader] = luoIkkuna(title);
    container.setAttribute("class", "popupContainer infoPopup muutoksetContainer");

    let content = document.createElement("div");
    
    let id = ''+Math.random();
    content.setAttribute("id", id);
    content.setAttribute("class", "muutoksetPopup");
    container.appendChild(content);

    dragElement(container);

    muutokset.forEach(x => getJson(luotuja ? x(duration).luotuja : x(duration).poistuneita, luoRyhma(container, luotuja, x(duration).nimi)));
};

let luoRyhma = (container, luotuja, title) => data => {
    let h = document.createElement("h5");
    h.innerText = title;
    container.appendChild(h);

    let ul = document.createElement("ul");
    container.appendChild(ul);
    let d = Object.values(data).flat();
    d.forEach(x => {
        let voimassa = (x.objektinVoimassaoloaika || x.voimassa).split('/');

        let li = document.createElement("li");
        ul.appendChild(li);
        
        let links = document.createElement("ul");
        li.appendChild(links);
        links.innerHTML = luoLinkit('muutokset', x.tunniste, x.tunniste, voimassa[0] + '/' + voimassa[0]);
        
        li.appendChild(document.createTextNode(x.tunniste));
        let i = document.createElement('i');
        li.appendChild(i);
        i.innerText = dateFns.dateFns.format(dateFns.dateFnsTz.utcToZonedTime(voimassa[luotuja ? 0 : 1], 'Europe/Helsinki'), "dd.MM.yyyy HH:mm");
    });
    if (d.length == 0) {
        ul.innerHTML = '<li>-</li>';
    }
};