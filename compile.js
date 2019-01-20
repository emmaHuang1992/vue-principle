//编译器，就是扫描模板中所有依赖（就是指令），对每一个指令创建更新函数watcher
class Compile {
    //创建编译器的时候的构造函数，创建之后就开始扫描编译一次
    constructor(el,vm){
        //el 是宿主元素
        //vm 是当前vue的实例

        //保存当前的实例
        this.$vm = vm;
        //el可以有几种写法，这里默认传入的是最简单的选择器
        this.$el = document.querySelector(el);
        if(this.$el){
            //将dom节点转换为Fragment，即虚拟节点，我们常常说的虚拟dom，来提高执行效率
            this.$fragment = this.node2Fragment(this.$el);
            if(this.$fragment){
                //对着这些个虚拟节点执行编译,就是把所有的指令进行编译
                this.compile(this.$fragment);
                //将生成的虚拟节点Fragment结果追加到宿主元素
                this.$el.appendChild(this.$fragment);

            }

        }
    }

    //将dom节点转换为Fragment提高执行效率，传入当前需要编译的dom节点，比如我们常常用的<div id="app"></div>
    node2Fragment(el){
        //创建一个新的fragment
        //createDocumentFragment创建了一虚拟的节点对象，节点对象包含所有属性和方法
        const fragment = document.createDocumentFragment();
        let child;
        //将原生的节点拷贝到fragment
        //这里是一个循环的操作，
        while((child = el.firstChild)){
            //appendChild是移动操作，会把el中的所有东西搬到fragment
            //因为这里的el.firstChild是原来的文档中已经存在的节点，使用appendChild会先删除，再放在新的地方
            fragment.appendChild(child);
        }
        return fragment;
    }

    //编译指定片段，这里传进来的el是虚拟dom
    compile(el){
        //对传入的虚拟dom的子节点，进行编译
        let childNodes = el.childNodes;
        //循环编译
        Array.from(childNodes).forEach(node =>{
            //判断node类型，做对应的处理
            if(this.isElementNode(node)){
                //元素节点 要识别v-xx @xx 识别指令事件
                this.compileElement(node);
            }else if(this.isTextNode(node) 
            && /\{\{(.*)\}\}/.test(node.textContent)){
                //文本节点，只需要识别{{xx}}
                //这里的正则中的括号是表示分组，RegExp.$1可以拿到分组中的内容
                this.compileText(node,RegExp.$1);//RegExp.$1匹配的内容

            }
            //递归处理，遍历可能存在的子节点
            if(node.childNodes && node.childNodes.length){
                this.compile(node);
            }
        })
    }

    //判断是不是元素节点，通过nodeType
    isElementNode(node){
        return node.nodeType == 1;//元素节点
    }
    //判断是否是文本节点
    isTextNode(node){
        return node.nodeType == 3;//元素节点
    }

    //对元素节点进行编译
    compileElement(node){
        //比如<div v-text="text" @click="onClick"></div>
        //获取节点中所有的属性
        const attrs =  node.attributes;
        Array.from(attrs).forEach(attr =>{
            //规定制定必须是v-xxx
            const attrName = attr.name;//属性名
            const exp = attr.value;//属性值
            if(this.isDirective(attrName)){
                //判断是指令
                //截取我们需要的值，就是v-之后的内容，就是指令的名称
                const dir = attrName.substr(2);
                //当处理这个指令的编译器存在，那么久开始对这个指令进行编译啦
                //在编译器中传入当前节点，当前的vue实例，以及当前的属性的值
                this[dir] && this[dir](node,this.$vm,exp)
            }else if(this.isEventDirective(attrName)){
                //判断是事件处理指令
                //获取事件指令的名称，比如model，click等
                const dir = attrName.substr(1);
                //在事件编译器中处理，传入当前节点，实例以及事件处理的函数名，还有事件指令的名字，比如click,model
                this.eventHandler(node,this.$vm,exp,dir)
            }

        })
    }

    //文本编译器
    compileText(node,exp){
        //这里编译文本节点就是对文本进行更新
        this.text(node,this.$vm,exp)
    }
    //判断是否是指令
    isDirective(attr){
        return attr.indexOf('v-') == 0
    }
    //判断是否是事件
    isEventDirective(dir){
        return dir.indexOf('@') == 0
    }
    //文本更新，v-text
    text(node,vm,exp){
        this.update(node,vm,exp,'text')
    }
    //处理html,v-html
    html(node,vm,exp){
        this.update(node,vm,exp,'html')
    }
    //处理双向绑定，v-model
    model(node,vm,exp){
        this.update(node,vm,exp,'model');
        //处理对视图的更新,对这个节点绑定对事件input的监听，当input监听到时，将当前的值更新
        node.addEventListener('input',e =>{
            vm[exp] = e.target.value;
        })
    }

    //更新
    update(node,vm,exp,dir){
        //传入的是当前节点，当前vue实例，键名，更新类型
        //获取当前需要的更新器
        let updaterFn = this[dir + 'Updater'];
        //立即执行更新
        updaterFn && updaterFn(node,vm[exp]);//立刻执行更新，vm[exp]就是去get了，拿数据的时候就有了依赖，有了dep.target
        //更新完之后新建一个监听器，当有改变的时候对其进行更新
        //有改变就是在有通知更新的时候进行更新
        new Watcher(vm,exp,function (value){
            updaterFn && updaterFn(node,value)
        })
    }
    textUpdater(node,value){
        node.textContent = value;
    }
    htmlUpdater(node,value){
        node.innerHtml = value;
    }
    modelUpdater(node,value){
        node.value = value;
    }

    //传入当前节点，实例以及事件处理的函数名，还有事件指令的名字，比如click,model
    eventHandler(node,vm,exp,dir){
        //这个要处理的函数是否存在
        let fn = vm.$options.methods && vm.$options.methods[exp];
        //当函数存在，增加监听器，
        if(dir && fn){
            //给这个节点增加事件监听器，当事件执行时，执行fn.bind(vm)这个函数
            //注意：fn本身是一个函数，fn.bind(vm)是一个新的函数，把fn中的this对象指向了当前的实例，调用fn.bind(vm)：fn.bind(vm)()
            
            node.addEventListener(dir,fn.bind(vm),false)
        }
    }
}
