//建立一个Vue类,创立实例时：new Vue({传入配置项options})
class Vue {
    //Vue类的构造函数
    constructor(options){
        //保存传进来的options
        this.$options = options;
        //保存options中的data选项
        this.$data = options.data;
        //对data中的数据增加响应式处理
        this.observe(this.$data);//执行响应式响应
        // //对传入的宿主元素进行编译，编译其中的指令，需要渲染的地方
        this.$compile = new Compile(options.el,this);
    }

    //进行数据即data的响应式处理
    observe(value){
        //判断传进来的数据的格式，一般情况下是个对象，有时候是个函数，这里默认为最简单的对象的情况
        if(!value || typeof value !== 'object'){
            return;
        }
        //遍历data中的数据，对data中的每一个项绑定响应式的处理，Object.key(value,forEach(key)=>{})是对象的遍历处理
        Object.keys(value).forEach(key =>{
            //给data中的每一个数据设置一个响应式，也就是设置一个getter和setter，获取和设置的处理
            this.defineReactive(value,key,value[key]);
            //为vue的data做属性代理，这里的意思是把data中的每一个值绑定到this对象中，一遍this[data中的键值]也可以调用
            this.proxyData(key);
        })
    }

    //给数据定义响应式处理，设置数据的get 和 set，传入的参数：整个对象，键名，键值
    defineReactive(obj,key,val){
        //对当前的键值里面的值执行响应式的处理，此处是递归调用，知道键值不是对象位置，就停止了
        this.observe(val);

        //新建一个Dep类，Dep类表示依赖，对每一个Data向需要增加Watcher，即监听，以便实现依赖管理
        const dep = new Dep();
        //为当前对象的当前键名的值定义属性，get和set方法
        Object.defineProperty(obj,key,{
            enumerable:true,//是否可以遍历，原名，是否可枚举
            configurable:true,//是否可以修改和删除
            //get方法，获取
            get(){
                //判断依赖中的target是否有值，有值就增加依赖，否则就不增加
                Dep.target && dep.addDep(Dep.target);
                //直接返回当前的键值，不做任何操作
                return val;
            },
            //set方法，设置
            set(newVal){
                //判断要设置的值是否改变，没有改变不执行下面代码
                if(newVal === val){
                    return;
                }
                //改变之后，将新的值赋给当前的键值，注意，上面已经传入
                val = newVal;
                //设置之后，调用dep的通知方法，通知Watcher进行更新，通知dom进行渲染
                dep.notify();
            }
        })
    }

    //把data中的每一个值绑定到this对象，使其可以通过this直接对data中的数据进行获取和设置
    proxyData(key){
        Object.defineProperty(this,key,{
            get(){
                return this.$data[key];  
            },
            set(newVal){
                this.$data[key] = newVal;
            }
        })
    }
}

// 依赖管理器，负责将试图中所有依赖收集管理
// 什么叫依赖，指的是html中的一些执行比如{{test}}，其中的test是依赖于this.$data.test这个数据的，
//对所有这些需要有依赖的部分进行管理，就要对所有这些依赖增加监听，即Watcher,即对所有的Watcher进行管理
//包括依赖添加和通知
class Dep {
    //新建Dep类的时候，建立可一个deps数组用来存放所有的依赖
    constructor(){
        this.deps = [];//deps里面存放的全是watcher实例
    }
    //依赖类中可以添加依赖
    addDep(dep){
        this.deps.push(dep)
    }
    //通知所有依赖即watcher执行更新
    notify(){
        this.deps.forEach(dep =>{
            dep.update();
        })
    }
    
}
//watcher ：具体的更新执行者，
class Watcher {
    //在建立Watcher类的时候，传入当前实例，键名，和回调
    constructor(vm,key,cb){
        this.vm = vm;
        this.key = key;
        this.cb = cb;

        //将来new 一个监听器时，
        //将当前watcher的实例附加到dep.target，作为一个添加依赖的条件，只在创建监听器的时候执行设置target
        Dep.target = this;
        //触发了get,增加了依赖
        this.vm[this.key];
        //添加完了依赖之后，就把这个值设置为空，以防下棋进去再执行添加依赖的操作
        Dep.target = null;

    }

    //更新
    update(){
        this.cb.call(this.vm,this.vm[this.key])
    }
}