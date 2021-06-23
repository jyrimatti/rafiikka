let parseInterval = str => {
    let instant = dateFns.dateFns.parse(str, "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
    if (!isNaN(instant.getTime())) {
        return [instant, instant, undefined, undefined];
    }
    let parts = str.split('/');
    if (parts.length == 2) {
        let beginInstant  = dateFns.dateFns.parse(parts[0], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        let endInstant    = dateFns.dateFns.parse(parts[1], "yyyy-MM-dd'T'HH:mm:ssX", new Date(0));
        let beginDuration;
        try {
            beginDuration = dateFns.durationFns.parse(parts[0]);
        } catch (_) {}
        let endDuration;
        try {
            endDuration = dateFns.durationFns.parse(parts[1]);
        } catch (_) {}
        if (!isNaN(beginInstant.getTime()) && !isNaN(endInstant.getTime())) {
            return [beginInstant, endInstant, undefined, undefined];
        } else if (!isNaN(beginInstant.getTime()) && endDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(endDuration))});
            return [beginInstant, dateFns.dateFns.add(beginInstant, endDuration), undefined, endDuration];
        } else if (!isNaN(endInstant.getTime()) && beginDuration) {
            let k = dateFns.durationFns.normalize({milliseconds: Math.floor(dateFns.durationFns.toMilliseconds(beginDuration))});
            return [dateFns.dateFns.sub(endInstant, beginDuration), endInstant, beginDuration, undefined];
        }
    }
    return undefined;
}

let parseStatePart = str => {
    if (str == 'kartta' || str == 'map') {
        return {moodi: 'kartta'};
    } else if (str == 'kaavio' || str == 'diagram') {
        return {moodi: 'kaavio'};
    } else {
        let interval = parseInterval(str);
        if (interval) {
            return {aika: interval};
        } else {
            return {sijainti: str};
        }
    }
};

let defaultAika = () => {
    let now = new Date();
    return [dateFns.dateFns.sub(now, {hours: 1}), dateFns.dateFns.add(now, {hours: 3}), undefined, {hours: 4}];
};

let defaultState = () => ({moodi:'kartta', aika: defaultAika(), sijainti: '009'});

let getStates = () => window.location.hash.substring(1).split('#').map(x => new URLSearchParams('?' + x));

let getState = index => key => {
    let state = getStates()[index];
    let st = defaultState();
    state.forEach((_,key) => Object.entries(parseStatePart(key)).forEach(kv => st[kv[0]] = kv[1]));
    return st[key];
};

let printDuration = dur => {
    let rounded = {minutes: Math.floor(dateFns.durationFns.toMinutes(dur))};
    return dur === undefined ? undefined : dateFns.durationFns.toString(dateFns.durationFns.normalize(rounded));
};

let printState = state => state.moodi + '&' +
                          (printDuration(state.aika[2]) || toISOStringNoMillis(state.aika[0])) + '/' + (printDuration(state.aika[3]) || toISOStringNoMillis(state.aika[1])) +
                          (state.sijainti ? '&' + (state.sijainti instanceof Array ? state.sijainti.join("-") : state.sijainti) : '');

let hashPlaceholder = '&loading...';

let setState = index => (key, val) => {
    let states = getStates();
    states[index][key] = states[index][key] || defaultState()[key];
    if (key == 'aika') {
        if (states[index][key][2]) {
            val[2] = dateFns.durationFns.between(val[0], val[1]);
        }
        if (states[index][key][3]) {
            val[3] = dateFns.durationFns.between(val[0], val[1]);
        }
    }
    states[index][key] = val;
    window.location.hash = '#' + states.map(s => printState({...defaultState(), ...s})).join('#') + hashPlaceholder;
};

window.addEventListener('hashchange', e => {
    if (e.newURL.indexOf(hashPlaceholder) > -1 || e.oldURL === e.newURL + hashPlaceholder) {
        window.location.hash = window.location.hash.replace(hashPlaceholder, '');
        e.stopImmediatePropagation();
    }
  }, false);


let getMainState = getState(0);
let setMainState = setState(0);
