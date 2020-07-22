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
  constructor(type) {
    this.root = document.createTextNode(type);
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

    if (JSON.stringify(this.state) === JSON.stringify(state)) {
      return;
    }

    new Promise((resolve, reject) => {
      let merge = (prevState, nextState) => {
        for (const p in nextState) {
          if (typeof nextState[p] === "object" && nextState[p] !== null) {
            if (typeof prevState[p] !== "object") {
              if (nextState[p] instanceof Array) {
                prevState[p] = [];
              } else {
                prevState[p] = {};
              }
            }
            merge(prevState[p], nextState[p]);
          } else {
            prevState[p] = nextState[p];
          }
        }
      };
      if (!this.state && state) {
        this.state = {};
      }
      merge(this.state, state);

      resolve();
    }).then(() => fn())
    this.update();
  }

  update() {
    const vdom = this.vdom;

    if (this.oldVdom) {
      const isSameNode = (nextTreeNode, prevTreeNode) => {
        if (!nextTreeNode || !prevTreeNode) {
          return false;
        }
        if (nextTreeNode.type !== prevTreeNode.type) {
          return false;
        }
        for (let name in nextTreeNode.props) {
          if (
            typeof nextTreeNode.props[name] === 'object' &&
            typeof prevTreeNode.props[name] === 'object' &&
            JSON.stringify(prevTreeNode.props[name]) === JSON.stringify(nextTreeNode.props[name])
          ) {
            continue;
          }
          if (nextTreeNode.props[name] !== prevTreeNode.props[name]) {
            return false;
          }
        }
        if (Object.keys(nextTreeNode.props).length !== Object.keys(prevTreeNode.props).length) {
          return false;
        }
        return true;
      }

      const isSameTree = (nextTreeNode, prevTreeNode) => {

        if (!isSameNode(nextTreeNode, prevTreeNode)) {
          return false;
        }

        if (nextTreeNode.children.length !== prevTreeNode.children.length) {
          return false;
        }

        for (let i = 0; i < nextTreeNode.children.length; i++) {
          if (!isSameTree(nextTreeNode.children[i], prevTreeNode.children[i])) return false;
        }

        return true;
      }

      const replace = (nextTreeNode, prevTreeNode, indent) => {
        if (isSameTree(nextTreeNode, prevTreeNode)) {
          return;
        }

        if (!isSameNode(nextTreeNode, prevTreeNode)) {
          nextTreeNode.mountTo(prevTreeNode.range)
        } else {
          for (let i = 0; i < nextTreeNode.children.length; i++) {
            replace(nextTreeNode.children[i], prevTreeNode.children[i], " " + indent)
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

