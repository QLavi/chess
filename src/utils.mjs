export const print = console.log;
export const error = console.error;

// generate a unique id every function call
let i = 0;
export function auto() {
    return (i += 1);
}

// checks whether `el` is in array `arr`
export function includes(arr, el) {
    for (const a of arr) {
        if (JSON.stringify(a) === JSON.stringify(el)) return true;
    }
    return false;
}

export function create_element(tag, options) {
    const el = document.createElement(tag);
    set_properties(el, options);
    return el;
}

export function set_properties(el, options) {
    for (const [key, value] of Object.entries(options)) {
        if (typeof value === "object") {
            el = Object.assign(el[key], value);
        } else {
            el[key] = value;
        }
    }
}

export function remove_elements_with_classname(name) {
    const els = document.getElementsByClassName(name);
    for (let i = els.length - 1; i >= 0; i -= 1) {
        els[i].parentNode.removeChild(els[i]);
    }
}

export default {
    print,
    error,
    auto,
    includes,
    create_element,
    set_properties,
    remove_elements_with_classname,
};
