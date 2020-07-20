import { ToyReact, Component } from './ToyReact';
class MyComp extends Component {
  render() {
    return <div>
      <span>Hello, World!</span>
      <div>
        {this.children}
      </div>
    </div>
  }
}

let a = <MyComp name='a' id='11'>
  <span>哈哈哈?</span>
</MyComp>

ToyReact.render(a, document.body)
