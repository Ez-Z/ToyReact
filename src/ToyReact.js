class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }

  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {
      let eventName = RegExp.$1.replace(/^[\s\S]/, s => s.toLowerCase())
      this.root.addEventListener(eventName, value);
    }
    if (name === 'className') {
      this.root.setAttribute('class', value)
    }
    this.root.setAttribute(name, value);
  }

  appendChild(vchild) {
    let range = document.createRange();
    if (this.root.children.length) {
      range.setStartAfter(this.root.lastChild);
      range.setEndAfter(this.root.lastChild);
    } else {
      range.setStart(this.root, 0);
      range.setEnd(this.root, 0);
    }
    
    vchild.mountTo(range);
  }

  mountTo(range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
  
  mountTo(range) {
    range.deleteContents();
    range.insertNode(this.root);
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

  setState(state) {
    let isChanged = false;
    let merge = (prevState, nextState) => {
      for (let p in nextState) {
        if (typeof nextState[p] === 'object') {
          if (typeof prevState[p] !== 'object') {
            prevState[p] = {};
          }
          merge(prevState[p], nextState[p])
        } else {
          if (prevState[p] !== nextState[p]) {
            prevState[p] = nextState[p];
            isChanged = true;
          }
        }
      }
    }
    if (!this.state && state) {
      this.state = {};
    }

    merge(this.state, state);
    if (isChanged) {
      this.update();
    }
  }

  update() {
    let placehoader = document.createComment("placehoader");
    let range = document.createRange();
    if (this.range.endContainer) {
      range.setStart(this.range.endContainer, this.range.endOffset);
      range.setEnd(this.range.endContainer, this.range.endOffset);
      range.insertNode(placehoader)
    }

    this.range.deleteContents();
    let vdom = this.render();
    vdom.mountTo(this.range);
    // placehoader.parentNode.removeChild(placehoader);
  }
}

export let ToyReact = {
  createElement(type, attributes, ...children) {
    let elm;
    if (typeof type === 'string') {
      elm = new ElementWrapper(type);
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
          // 无法识别的直接转为字符串, 如:对象
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

