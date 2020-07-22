let childrenSymbol = Symbol('children');

class ElementWrapper {
  constructor(type) {
    this.type = type;
    this[childrenSymbol] = [];
    this.props = Object.create(null);
    this.children = [];
  }

  setAttribute(name, value) {
    // if (name.match(/^on([\s\S]+)$/)) {
    //   let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
    //   this.root.addEventListener(eventName, value);
    // }
    // if (name === 'className') {
    //   this.root.setAttribute('class', value)
    // }
    this.props[name] = value;
  }

  appendChild(vchild) {
    this[childrenSymbol].push(vchild);
    this.children.push(vchild.vdom)
    // let range = document.createRange();
    // if (this.root.children.length) {
    //   range.setStartAfter(this.root.lastChild);
    //   range.setEndAfter(this.root.lastChild);
    // } else {
    //   range.setStart(this.root, 0);
    //   range.setEnd(this.root, 0);
    // }

    // vchild.mountTo(range);
  }

  // get children() {
  //   return this.children.map(child => child.vdom);
  // }

  get vdom() {
    return this;
  }

  mountTo(range) {
    this.range = range;
    let placehoader = document.createComment("placehoader");
    let endRange = document.createRange();
    if (range.endContainer) {
      endRange.setStart(range.endContainer, range.endOffset);
      endRange.setEnd(range.endContainer, range.endOffset);
      endRange.insertNode(placehoader)
    }

    range.deleteContents();

    let elm = document.createElement(this.type);

    for (let name in this.props) {
      let value = this.props[name];
      elm.setAttribute(name, value);
      if (name.match(/^on([\s\S]+)$/)) {
        let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
        elm.addEventListener(eventName, value);
      }
      if (name === 'className') {
        elm.setAttribute('class', value)
      }
      elm.setAttribute(name, value);
    }
    for (let child of this.children) {
      let range = document.createRange();
      if (elm.children.length) {
        range.setStartAfter(elm.lastChild);
        range.setEndAfter(elm.lastChild);
      } else {
        range.setStart(elm, 0);
        range.setEnd(elm, 0);
      }

      child.mountTo(range);
    }
    range.insertNode(elm);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
    this.type = '#text';
    this.children = [];
    this.props = Object.create(null);
  }

  mountTo(range) {
    this.range = range;
    range.deleteContents();
    range.insertNode(this.root);
  }

  get vdom() {
    return this;
  }
}

export class Component {
  constructor() {
    this.children = [];
    this.props = Object.create(null);
  }

  setAttribute(name, value) {
    this.props[name] = value;
    this[name] = value;
  }

  mountTo(range) {
    this.range = range;
    this.update();
  }

  appendChild(vchild) {
    this.children.push(vchild);
  }

  get vdom() {
    return this.render().vdom;
  }

  get type() {
    return this.constructor.name;
  }

  setState(state, fn = () => { }) {
    let merge = (prevState, nextState) => {
      for (let p in nextState) {
        if (typeof nextState[p] === 'object' && nextState !== null) {
          if (typeof prevState[p] !== 'object') {
            if (nextState[p] instanceof Array) {
              prevState[p] = [];
            } else {
              prevState[p] = {};
            }
          }
          merge(prevState[p], nextState[p])
        } else {
          prevState[p] = nextState[p];
        }
      }
    }
    if (!this.state && state) {
      this.state = {};
    }

    merge(this.state, state);
    this.update();
  }

  update() {
    let vdom = this.vdom;
    if (this.oldVdom) {
      let isSameNode = (node1, node2) => {
        if (node1.type !== node2.type) {
          return false;
        }
        for (let name of node1.props) {
          if (typeof node1.props[name] === "function" &&
            typeof node2.props[name] === "function" &&
            node1.props[name].toString() === node2.props[name].toString()
          ) continue;

          if (typeof node1.props[name] === "object" &&
            typeof node2.props[name] === "object" &&
            JSON.stringify(node1.props[name]) === JSON.stringify(node2.props[name])
          ) continue;

          if (node1.props[name] !== node2.props[name]) {
            return false;
          }
        }
        if (node1.props.length !== node2.props.length) {
          return false;
        }

        return true;
      }

      let isSameTree = (node1, node2) => {
        if (!isSameNode(node1, node2)) {
          return false;
        }
        if (node1.children.length !== node2.children.length) {
          return false;
        }
        for (let i = 0; i < node1.children.length; i++) {
          if (!isSameNode(node1.children[i], node2.children[i])) return false;
        }

        return true;
      }

      let replace = (newTree, oldTree, indent) => {
        if (isSameTree(vdom, this.vdom)) {
          console.log('all same');
          return;
        }

        if (!isSameNode(newTree, oldTree)) {
          newTree.mountTo(oldTree.range);
        } else {
          for (let i = 0; i < newTree.children.lenght; i++) {
            replace(newTree.children[i], oldTree.children[i], " " + indent)
          }
        }
      }

      if (isSameTree(vdom, this.oldVdom)) {
        return;
      }

      replace(vdom, this.oldVdom, "");

    } else {
      vdom.mountTo(this.range);
    }

    this.oldVdom = vdom;
  }
}

export let ToyReact = {
  createElement(type, attributes, ...children) {
    let elm;
    if (typeof type === 'string') {
      elm = new ElementWrapper(type, attributes);
    } else {
      elm = new type;
    }

    for (let name in attributes) {
      elm.setAttribute(name, attributes[name])
    }

    let insertChildren = (children) => {
      for (let child of children) {
        if (typeof child === 'object' && child instanceof Array) {
          insertChildren(child)
        }
        else {

          if (child === null || child === void 0) {
            child = "";
          }

          if (!(child instanceof ElementWrapper) &&
            !(child instanceof TextWrapper) &&
            !(child instanceof Component)) {
            child = String(child);
          }
          if (typeof child === 'string') {
            child = new TextWrapper(child);
          }

          elm.appendChild(child);
        }
      }
    };

    insertChildren(children);

    return elm;
  },
  render(vdom, element) {
    let range = document.createRange();
    if (element.children.length) {
      range.setStartAfter(element.lastChild);
      range.setEndAfter(element.lastChild);
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }
    vdom.mountTo(range);
  }
}

