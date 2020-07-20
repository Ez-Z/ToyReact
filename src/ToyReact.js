class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }

  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }

  appendChild(vchild) {
    vchild.mountTo(this.root);
  }

  mountTo(parent) {
    parent.appendChild(this.root)
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
  }
  
  mountTo(parent) {
    parent.appendChild(this.root)
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
    vdom.mountTo(element);
  }
}

export class Component {
  constructor() {
    this.children = [];
  }

  setAttribute(name, value) {
    this[name] = value;
  }

  mountTo(parent) {
    let vdom = this.render();
    vdom.mountTo(parent);
  }

  appendChild(vchild) {
    this.children.push(vchild);
  }
}