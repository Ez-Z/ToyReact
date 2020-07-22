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
    let placeholder = document.createComment('placeholder');
    let endRange = document.createRange();

    endRange.setStart(range.endContainer, this.range.endOffset)
    endRange.setEnd(range.endContainer, this.range.endOffset);
    endRange.insertNode(placeholder);
    range.deleteContents();
    const element = document.createElement(this.type);

    for (let name in this.props) {
      const value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        let eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
        element.addEventListener(eventName, value);
      }
      if (name === 'className') {
        element.setAttribute('class', value)
      }
      element.setAttribute(name, value);
    }

    for (let child of this.children) {
      const range = document.createRange();
      if (element.children.length) {
        range.setStartAfter(element.lastChild)
        range.setEndAfter(element.lastChild)
      } else {
        range.setStart(element, 0)
        range.setEnd(element, 0)
      }
      child.mountTo(range)
    }

    range.insertNode(element);
  }
}

class TextWrapper {
  constructor(context) {
    this.root = document.createTextNode(context);
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
    return this.constructor.type;
  }

  setState(state) {
    let merge = (oldState, newState) => {
      for (const p in newState) {
        if (typeof newState[p] === "object" && newState[p] !== null) {
          if (typeof oldState[p] !== "object") {
            if (newState[p] instanceof Array) {
              oldState[p] = [];
            } else {
              oldState[p] = {};
            }
          }
          merge(oldState[p], newState[p]);
        } else {
          oldState[p] = newState[p];
        }
      }
    };
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
        
        for (const name in node1.props) {
          if (
            typeof node1.props[name] !== "object" &&
            typeof node2.props[name] !== "object" &&
            JSON.stringify(node1.props[name]) === JSON.stringify(node2.props[name])
          ) {
            continue;
          }
          if (node1.props[name] !== node2.props[name]) {
            return false;
          }
        }
        if (Object.keys(node1.props).length !== Object.keys(node2.props).length) {
          return false;
        }
        return true;
      };

      let isSameTree = (node1, node2) => {
        if (!isSameNode(node1, node2)) {
          return false;
        }
        if (node1.children.length !== node2.children.length) {
          return false;
        }
        for (let i = 0; i < node1.children.length; i++) {
          if (!isSameTree(node1.children[i], node2.children[i])) {
            return false;
          }
        }

        return true;
      }

      let replace = (newTree, oldTree, indent) => {
        if (isSameTree(newTree, oldTree)) {
          console.log('all same');
          return;
        }
        // newTree.mountTo(oldTree.range);
        if (!isSameNode(newTree, oldTree)) {
          newTree.mountTo(oldTree.range);
        } else {
          for (let i = 0; i < newTree.children.lenght; i++) {
            replace(newTree.children[i], oldTree.children[i], " " + indent)
          }
        }
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

